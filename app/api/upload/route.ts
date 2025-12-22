// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink, writeFile } from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// セキュリティ: 許可されたファイル拡張子
const ALLOWED_EXTENSIONS = [".csv"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const STORAGE_BUCKET = "analysis-data"; // Supabaseのバケット名

// セキュリティ: ファイル名のサニタイズ
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Pythonスクリプトを実行するヘルパー関数
function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const allowedScriptsDir = path.resolve(process.cwd(), "scripts");
    const resolvedScriptPath = path.resolve(scriptPath);
    if (!resolvedScriptPath.startsWith(allowedScriptsDir)) {
      reject(new Error("不正なスクリプトパスです"));
      return;
    }

    console.log(
      `[Python実行]: python3 ${path.basename(scriptPath)} ${args.join(" ")}`,
    );

    const pythonProcess = spawn("python3", [scriptPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });
    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (stderrData) {
        console.log(
          `[Python ${path.basename(scriptPath)} stderr]:\n${stderrData}`,
        );
      }

      if (code === 0) {
        resolve(stdoutData.trim());
      } else {
        reject(
          new Error(
            `Pythonスクリプト ${
              path.basename(scriptPath)
            } がエラー終了しました (コード: ${code})`,
          ),
        );
      }
    });
    pythonProcess.on("error", (err) => {
      console.error(
        `Pythonスクリプト ${path.basename(scriptPath)} の起動に失敗:`,
        err,
      );
      reject(new Error(`Pythonスクリプトの起動に失敗: ${err.message}`));
    });
  });
}

// ファイル名から年月とフロア名を抽出する関数
function extractFileInfo(
  filePath: string,
): { yearMonth: string | null; floor: string | null } {
  const filename = path.basename(filePath);
  const match = filename.match(/(\d{6})?.*?_processed_temp_([^_]+)\.csv/i);
  if (match && match.length >= 3) {
    let yearMonth = null;
    const dateMatch = filename.match(/(20\d{4})\d{0,2}/);
    if (dateMatch) {
      yearMonth = dateMatch[1];
    }
    let floor = match[2];
    if (floor.toLowerCase() === "小規模多機能") floor = "shokibo";
    else if (floor === "1F") floor = "1F";
    else if (floor === "2F") floor = "2F";
    return { yearMonth, floor };
  }
  console.warn(
    `ファイル名から年月またはフロア名を抽出できませんでした: ${filename}`,
  );
  return { yearMonth: null, floor: null };
}

export async function POST(request: NextRequest) {
  // セキュリティ: 認証チェック
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { session }, error: authError } = await supabase.auth
    .getSession();

  if (authError || !session) {
    return NextResponse.json({ message: "認証が必要です" }, { status: 401 });
  }

  let tempInputPath = ""; // アップロードされたCSVの一時パス
  const intermediateCsvPaths: string[] = []; // process_csv.pyが生成したCSVのパスリスト
  const tempFilesToDelete: string[] = []; // 最後に削除する一時ファイルのリスト

  try {
    const formData = await request.formData();
    const file = formData.get("files") as File | null;

    if (!file) {
      return NextResponse.json({
        message: "ファイルがアップロードされていません",
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        message: "ファイルサイズが大きすぎます（最大10MB）",
      }, { status: 400 });
    }

    const fileExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({
        message: "許可されていないファイル形式です（CSV形式のみ）",
      }, { status: 400 });
    }

    // --- 1. アップロードされたファイルを一時保存 ---
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const safeFilename = sanitizeFilename(file.name);
    tempInputPath = path.join(
      os.tmpdir(),
      `upload_${Date.now()}_${safeFilename}`,
    );
    await writeFile(tempInputPath, buffer);
    tempFilesToDelete.push(tempInputPath);
    console.log(`一時ファイル保存先: ${tempInputPath}`);

    // --- 2. process_csv.py を実行 ---
    const processCsvScript = path.resolve(
      process.cwd(),
      "scripts",
      "process_csv.py",
    );
    console.log(`process_csv.py 実行中... 入力: ${tempInputPath}`);
    const intermediatePathsOutput = await runPythonScript(processCsvScript, [
      tempInputPath,
    ]);
    const receivedIntermediatePaths = intermediatePathsOutput.split("\n")
      .filter((p) => p.trim() !== "");

    const tmpDir = os.tmpdir();
    for (const intermediateP of receivedIntermediatePaths) {
      const resolvedPath = path.resolve(intermediateP);
      if (!resolvedPath.startsWith(tmpDir)) {
        throw new Error("不正なファイルパスが検出されました");
      }
    }

    intermediateCsvPaths.push(...receivedIntermediatePaths);
    tempFilesToDelete.push(...receivedIntermediatePaths);

    if (intermediateCsvPaths.length === 0) {
      throw new Error("process_csv.pyがフロア別ファイルを生成しませんでした。");
    }

    // --- 4.各フロア別CSVに対して tome_evaluation.py を実行 ---
    for (const intermediatePath of intermediateCsvPaths) {
      const evaluationScript = path.resolve(
        process.cwd(),
        "scripts",
        "tome_evaluation.py",
      );

      // --- 5. JSONファイル名を決定 ---
      const { yearMonth, floor } = extractFileInfo(intermediatePath);
      const resolvedYearMonth = yearMonth || new Date().toISOString().slice(0, 7).replace('-', '');

      if (!floor) {
        console.warn(
          `フロア名が特定できなかったため、JSON生成をスキップ: ${intermediatePath}`,
        );
        continue;
      }
      const jsonFilename = `${resolvedYearMonth}_${floor}_analysis.json`;

      // JSONを一時ファイルとして出力させる (Supabaseアップロード用)
      const tempJsonPath = path.join(
        os.tmpdir(),
        `temp_${Date.now()}_${jsonFilename}`,
      );
      tempFilesToDelete.push(tempJsonPath);

      // --- 6. tome_evaluation.py を実行し、一時ファイルにJSONを書き込ませる ---
      console.log(
        `tome_evaluation.py 実行中... 入力: ${intermediatePath}, 出力(一時): ${tempJsonPath}`,
      );
      await runPythonScript(evaluationScript, [intermediatePath, tempJsonPath]);

      // --- 7. 生成されたJSONファイルを読み込んでSupabase Storageにアップロード ---
      try {
        const jsonContent = await readFile(tempJsonPath); // ファイルをバッファとして読み込む

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from(STORAGE_BUCKET)
          .upload(jsonFilename, jsonContent, {
            contentType: "application/json",
            upsert: true, // 同名ファイルがある場合は上書き
          });

        if (uploadError) {
          throw new Error(
            `Supabase Storageへのアップロード失敗: ${uploadError.message}`,
          );
        }

        console.log(`Supabase Storageにアップロード完了: ${jsonFilename}`);
      } catch (readUploadError) {
        console.error(
          `JSONファイルの読み込みまたはアップロードに失敗: ${tempJsonPath}`,
          readUploadError,
        );
        throw readUploadError; // 必要に応じてエラーハンドリングを調整してください
      }
    }

    return NextResponse.json({
      message: "処理が完了し、Supabase Storageに保存されました。",
    }, { status: 200 });
  } catch (error: any) {
    console.error("APIルートでのエラー:", error);
    return NextResponse.json({
      message: "ファイルの処理中にエラーが発生しました",
      error: error.message,
    }, { status: 500 });
  } finally {
    // --- 8. 一時ファイルを削除 ---
    console.log("一時ファイルを削除します:", tempFilesToDelete);
    for (const tempPath of tempFilesToDelete) {
      try {
        await unlink(tempPath);
      } catch (unlinkError: any) {
        // ファイルが存在しない場合のエラーは無視（Python側で生成されなかった場合など）
        if (unlinkError.code !== "ENOENT") {
          console.error(`一時ファイルの削除に失敗 ${tempPath}:`, unlinkError);
        }
      }
    }
  }
}

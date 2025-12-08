// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises'; // readFileは不要になった
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
// Papaは不要になった

// セキュリティ: 許可されたファイル拡張子
const ALLOWED_EXTENSIONS = ['.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// セキュリティ: ファイル名のサニタイズ
function sanitizeFilename(filename: string): string {
  // 危険な文字を除去
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Pythonスクリプトを実行するヘルパー関数 (セキュリティ強化版)
function runPythonScript(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // セキュリティ: スクリプトパスの検証
    const allowedScriptsDir = path.resolve(process.cwd(), 'scripts');
    const resolvedScriptPath = path.resolve(scriptPath);
    if (!resolvedScriptPath.startsWith(allowedScriptsDir)) {
      reject(new Error('不正なスクリプトパスです'));
      return;
    }

    // 実行するスクリプトと引数をログに出力
    console.log(`[Python実行]: python3 ${path.basename(scriptPath)} ${args.join(' ')}`);

    const pythonProcess = spawn('python3', [scriptPath, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

    pythonProcess.on('close', (code) => {
      // ▼▼▼【ここを修正】▼▼▼
      // stderrData (デバッグログ) があれば、常にコンソールに出力する
      if (stderrData) {
        console.log(`[Python ${path.basename(scriptPath)} stderr]:\n${stderrData}`);
      }
      // ▲▲▲【修正完了】▲▲▲

      if (code === 0) {
        // 成功時
        resolve(stdoutData.trim());
      } else {
        // 失敗時
        // (stderrDataはすでに出力されているので、ここではエラーメッセージのみ)
        reject(new Error(`Pythonスクリプト ${path.basename(scriptPath)} がエラー終了しました (コード: ${code})`));
      }
    });
    pythonProcess.on('error', (err) => {
        console.error(`Pythonスクリプト ${path.basename(scriptPath)} の起動に失敗:`, err);
        reject(new Error(`Pythonスクリプトの起動に失敗: ${err.message}`));
     });
  });
}

// ファイル名から年月とフロア名を抽出する関数 (変更なし)
function extractFileInfo(filePath: string): { yearMonth: string | null, floor: string | null } {
    const filename = path.basename(filePath);
    // ★★★ この正規表現は、process_csv.pyが出力するファイル名のパターンに合わせて調整が必要です ★★★
    // 例: "..._processed_temp_1F.csv"
    const match = filename.match(/(\d{6})?.*?_processed_temp_([^_]+)\.csv/i);
    if (match && match.length >= 3) {
        const yearMonth = match[1] || null; // 年月を取得 (なければnull)
        let floor = match[2];
        // フロア名を正規化（JSONファイル名用）
        if (floor.toLowerCase() === '小規模多機能') floor = 'shokibo';
        else if (floor === '1F') floor = '1F';
        else if (floor === '2F') floor = '2F';
        // 他に必要な正規化があれば追加
        return { yearMonth, floor };
    }
    console.warn(`ファイル名から年月またはフロア名を抽出できませんでした: ${filename}`);
    return { yearMonth: null, floor: null };
}

export async function POST(request: NextRequest) {
  // セキュリティ: 認証チェック
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 });
  }

  let tempInputPath = ''; // アップロードされたCSVの一時パス
  const intermediateCsvPaths: string[] = []; // process_csv.pyが生成したCSVのパスリスト
  // finalCsvPaths は不要になった
  const tempFilesToDelete: string[] = []; // 最後に削除する一時ファイルのリスト

  try {
    const formData = await request.formData();
    const file = formData.get('files') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'ファイルがアップロードされていません' }, { status: 400 });
    }

    // セキュリティ: ファイルサイズの検証
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'ファイルサイズが大きすぎます（最大10MB）' }, { status: 400 });
    }

    // セキュリティ: ファイル拡張子の検証
    const fileExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ message: '許可されていないファイル形式です（CSV形式のみ）' }, { status: 400 });
    }

    // --- 1. アップロードされたファイルを一時保存 ---
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // セキュリティ: ファイル名のサニタイズ
    const safeFilename = sanitizeFilename(file.name);
    tempInputPath = path.join(os.tmpdir(), `upload_${Date.now()}_${safeFilename}`);
    await writeFile(tempInputPath, buffer);
    tempFilesToDelete.push(tempInputPath);
    console.log(`一時ファイル保存先: ${tempInputPath}`);

    // --- 2. process_csv.py を実行 ---
    const processCsvScript = path.resolve(process.cwd(), 'scripts', 'process_csv.py');
    console.log(`process_csv.py 実行中... 入力: ${tempInputPath}`);
    const intermediatePathsOutput = await runPythonScript(processCsvScript, [tempInputPath]);
    const receivedIntermediatePaths = intermediatePathsOutput.split('\n').filter(p => p.trim() !== '');
    
    // セキュリティ: 生成されたファイルパスの検証
    const tmpDir = os.tmpdir();
    for (const intermediateP of receivedIntermediatePaths) {
      const resolvedPath = path.resolve(intermediateP);
      if (!resolvedPath.startsWith(tmpDir)) {
        throw new Error('不正なファイルパスが検出されました');
      }
    }
    
    intermediateCsvPaths.push(...receivedIntermediatePaths);
    tempFilesToDelete.push(...receivedIntermediatePaths); // 中間CSVも後で削除
    console.log(`process_csv.py が生成したファイル:`, intermediateCsvPaths);
    if (intermediateCsvPaths.length === 0) {
        throw new Error("process_csv.pyがフロア別ファイルを生成しませんでした。");
    }

    // --- 3. /data ディレクトリの存在確認・作成 ---
    const dataDir = path.resolve(process.cwd(), 'data');
    // セキュリティ: dataDirが期待されるパスであることを確認
    const expectedDataDir = path.resolve(process.cwd(), 'data');
    if (dataDir !== expectedDataDir) {
      throw new Error('不正なデータディレクトリパスです');
    }
    try {
        await mkdir(dataDir, { recursive: true });
    } catch (dirError: any) {
        if (dirError.code !== 'EEXIST') throw dirError;
    }

    // --- 4. (★修正) 各フロア別CSVに対して tome_evaluation.py を実行 ---
    for (const intermediatePath of intermediateCsvPaths) {
      const evaluationScript = path.resolve(process.cwd(), 'scripts', 'tome_evaluation.py');

      // --- 5. (★修正) 最終的なJSONファイル名を先に決定 ---
      const { yearMonth, floor } = extractFileInfo(intermediatePath);
      const resolvedYearMonth = yearMonth || new Date().toISOString().slice(0, 7).replace('-', '');

      if (!floor) {
          console.warn(`フロア名が特定できなかったため、JSON生成をスキップ: ${intermediatePath}`);
          continue; // フロア名が不明な場合はスキップ
      }
      const jsonFilename = `${resolvedYearMonth}_${floor}_analysis.json`;
      const jsonOutputPath = path.join(dataDir, jsonFilename); // 例: /app/data/202510_1F_analysis.json

      // --- 6. (★修正) tome_evaluation.py を実行し、JSONを直接書き込ませる ---
      console.log(`tome_evaluation.py 実行中... 入力: ${intermediatePath}, 出力: ${jsonOutputPath}`);
      
      // Pythonスクリプトに「入力CSVパス」と「出力JSONパス」を渡す
      const evaluationOutput = await runPythonScript(evaluationScript, [intermediatePath, jsonOutputPath]);
      
      // evaluationOutputには、tome_evaluation.pyが標準出力したJSONパスが入る
      console.log(`tome_evaluation.py が生成したファイル: ${evaluationOutput}`);

      // --- 7. (★削除) 
      // 以前のロジック (finalCsvPathの作成、readFile, JSON.parse, writeFile) は
      // Python側がJSONを直接書き込むため、すべて不要
    }

    return NextResponse.json({ message: '処理が完了し、JSONファイルが保存されました。' }, { status: 200 });

  } catch (error: any) {
    console.error('APIルートでのエラー:', error);
    return NextResponse.json({ message: 'ファイルの処理中にエラーが発生しました', error: error.message }, { status: 500 });
  } finally {
    // --- 8. 一時ファイルを削除 ---
    console.log('一時ファイルを削除します:', tempFilesToDelete);
    for (const tempPath of tempFilesToDelete) {
      try {
        await unlink(tempPath);
        console.log(`削除完了: ${tempPath}`);
      } catch (unlinkError) {
        console.error(`一時ファイルの削除に失敗 ${tempPath}:`, unlinkError);
      }
    }
  }
}
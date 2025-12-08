// app/api/process-csv/route.ts

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// セキュリティ: 許可されたファイル拡張子
const ALLOWED_EXTENSIONS = ['.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// セキュリティ: ファイル名のサニタイズ
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Pythonスクリプトを実行し、結果を返すヘルパー関数
const runPythonScript = (scriptPath: string, args: string[]): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // セキュリティ: スクリプトパスの検証
    const allowedScriptsDir = path.resolve(process.cwd(), 'scripts');
    const resolvedScriptPath = path.resolve(scriptPath);
    if (!resolvedScriptPath.startsWith(allowedScriptsDir) && !resolvedScriptPath.startsWith(process.cwd())) {
      reject(new Error('不正なスクリプトパスです'));
      return;
    }

    // 仮想環境を使っている場合などは 'python' を適切なパスに変更してください
    const pythonProcess = spawn('python3', [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script exited with code ${code}\n${stderr}`));
      }
      // スクリプトの標準出力からファイルパスを抽出
      const filePaths = stdout.match(/「([^」]+)」に保存しました。/g)?.map(line => {
        return line.match(/「([^」]+)」/)?.[1] || '';
      }).filter(Boolean) || [];

      resolve(filePaths);
    });
  });
};

export async function POST(request: Request) {
  // セキュリティ: 認証チェック
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
    }

    // セキュリティ: ファイルサイズの検証
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'ファイルサイズが大きすぎます（最大10MB）' }, { status: 400 });
    }

    // セキュリティ: ファイル拡張子の検証
    const fileExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: '許可されていないファイル形式です（CSV形式のみ）' }, { status: 400 });
    }

    // 一時ディレクトリにファイルを保存
    const tempDir = os.tmpdir();
    // セキュリティ: ファイル名のサニタイズ
    const safeFilename = sanitizeFilename(file.name);
    const tempFilePath = path.join(tempDir, safeFilename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(tempFilePath, buffer);
    console.log(`一時ファイルを保存しました: ${tempFilePath}`);

    // --- スクリプト1: process_csv.py を実行 ---
    const processCsvScriptPath = path.resolve('./process_csv.py'); // スクリプトのパス
    const processedFiles = await runPythonScript(processCsvScriptPath, [tempFilePath]);
    
    if (processedFiles.length === 0) {
      throw new Error("process_csv.pyがフロアごとのファイルを出力しませんでした。");
    }
    console.log('process_csv.py の出力ファイル:', processedFiles);

    // --- スクリプト2: tome_evaluation.py を実行 ---
    const tomeEvaluationScriptPath = path.resolve('./tome_evaluation_v2.py'); // スクリプトのパス
    for (const filePath of processedFiles) {
      console.log(`tome_evaluation_v2.py を実行中: ${filePath}`);
      await runPythonScript(tomeEvaluationScriptPath, [filePath]);
    }

    // 一時ファイルを削除
    await fs.unlink(tempFilePath);
    
    return NextResponse.json({ message: 'CSVの処理が正常に完了しました。' });

  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: `処理に失敗しました: ${errorMessage}` }, { status: 500 });
  }
}
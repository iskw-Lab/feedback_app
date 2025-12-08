import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// セキュリティ: 許可されたファイル拡張子
const ALLOWED_EXTENSIONS = ['.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// セキュリティ: ファイル名のサニタイズ
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Pythonスクリプトを実行し、標準出力を返すヘルパー関数
const runPythonScript = (scriptPath: string, args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    // セキュリティ: スクリプトパスの検証
    const allowedScriptsDir = path.resolve(process.cwd(), 'scripts');
    const resolvedScriptPath = path.resolve(scriptPath);
    if (!resolvedScriptPath.startsWith(allowedScriptsDir) && !resolvedScriptPath.startsWith(process.cwd())) {
      reject(new Error('不正なスクリプトパスです'));
      return;
    }

    const pythonProcess = spawn('python3', [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[${path.basename(scriptPath)}] stdout: ${data}`);
      stdout += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error(`[${path.basename(scriptPath)}] stderr: ${data}`);
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Script ${scriptPath} exited with code ${code}\n${stderr}`));
      }
      resolve(stdout);
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

  const tempId = uuidv4();
  const tempDir = os.tmpdir();
  let tempInputPath = '';

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

    // 1. アップロードされたファイルを一時保存
    // セキュリティ: ファイル名のサニタイズ
    const safeFilename = sanitizeFilename(file.name);
    tempInputPath = path.join(tempDir, `${tempId}_${safeFilename}`);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(tempInputPath, Buffer.from(bytes));

    // 2. process_csv.py を実行 (出力A)
    const processCsvScript = path.resolve('./process_csv.py');
    await runPythonScript(processCsvScript, [tempInputPath]);
    
    const outputPathA = tempInputPath.replace('.csv', '_processed.csv');
    // 注意: process_csv.pyが複数のフロアファイルを出力する場合、ここでは最初のファイルのみを処理します。
    // もし複数ファイルを扱いたい場合は、ここのロジックを拡張する必要があります。

    // 3. tome_evaluation.py を実行 (出力B)
    const tomeEvalScript = path.resolve('./tome_evaluation.py');
    await runPythonScript(tomeEvalScript, [outputPathA]);
    const outputPathB = outputPathA.replace('.csv', '_out.csv');

    // 4. merge_results.py を実行 (最終JSON)
    const mergeScript = path.resolve('./merge_results.py');
    const finalDataDir = path.join(process.cwd(), 'data');
    // セキュリティ: ディレクトリパスの検証
    const expectedDataDir = path.join(process.cwd(), 'data');
    if (finalDataDir !== expectedDataDir) {
      throw new Error('不正なディレクトリパスです');
    }
    await fs.mkdir(finalDataDir, { recursive: true }); // dataディレクトリがなければ作成
    await runPythonScript(mergeScript, [outputPathA, outputPathB, finalDataDir]);

    return NextResponse.json({ message: 'ファイルの処理と保存が正常に完了しました。' });

  } catch (error: any) {
    console.error('Full process API Error:', error);
    return NextResponse.json({ error: `処理に失敗しました: ${error.message}` }, { status: 500 });
  } finally {
    // 5. 一時ファイルをクリーンアップ
    try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
            if (file.startsWith(tempId)) {
                await fs.unlink(path.join(tempDir, file));
            }
        }
    } catch (e) {
        console.error('Failed to clean up temp files:', e);
    }
  }
}
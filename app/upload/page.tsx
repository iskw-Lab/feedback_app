// app/upload/page.tsx

"use client";

import React, { useState, useEffect } from 'react'; // useEffectをインポート
import { useRouter } from 'next/navigation'; // useRouterをインポート
import { createClient } from '@/lib/supabase/client'; // Supabaseクライアントをインポート
import { FileUploadBox } from '@/components/ui/file-upload-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Construction } from 'lucide-react';

export default function FileUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // 認証チェック中のローディング状態
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      // ログイン状態を確認
      const { data: { user } } = await supabase.auth.getUser();

      // ログインしていなければトップページにリダイレクト
      if (!user) {
        router.push('/');
      } else {
        // ログインしていればローディングを終了
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
    setUploadMessage(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError("アップロードするファイルを選択してください。");
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);
    setUploadError(null);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadMessage("ファイルのアップロードが完了しました！");
        console.log("Upload successful:", result);
        setSelectedFiles([]);
      } else {
        const errorData = await response.json();
        setUploadError(`アップロードに失敗しました: ${errorData.message || response.statusText}`);
        console.error("Upload failed:", errorData);
      }
    } catch (error) {
      setUploadError(`ネットワークエラー: ${error instanceof Error ? error.message : String(error)}`);
      console.error("Network error during upload:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setUploadMessage(null);
    setUploadError(null);
    setIsUploading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  /*return (
    // ★★★ メインコンテナのクラスを変更 ★★★
    <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4 pt-16">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">ファイルのアップロード</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadBox
            onFilesChange={handleFilesChange}
            acceptedFileTypes=".xlsx,.csv"
            maxFiles={1}
            disabled={isUploading}
          />
          {uploadMessage && (
            <p className="mt-4 text-green-600 text-center">{uploadMessage}</p>
          )}
          {uploadError && (
            <p className="mt-4 text-red-600 text-center">{uploadError}</p>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading}
              className="text-gray-700 hover:bg-gray-100"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isUploading ? <LoadingSpinner /> : "アップロードを実行"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );// 修正前のreturn文をコメントアウト*/
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {/* アイコン表示: lucide-reactがない場合はSVGタグに置き換えてください */}
            <Construction className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            現在開発中です
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-6">
            CSVファイルのアップロード機能およびデータ処理機能は現在実装作業中です。
          </p>

          <div className="flex justify-center">
            <Button
              onClick={() => router.push('/dashboard')} // ホームやダッシュボードに戻る
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              ホームに戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
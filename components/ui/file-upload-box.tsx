// src/components/ui/file-upload-box.tsx

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Tailwind CSSのユーティリティクラスを結合するためのヘルパー

interface FileUploadBoxProps {
  onFilesChange: (files: File[]) => void;
  acceptedFileTypes?: string; // 例: ".xlsx,.csv,.pdf"
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export const FileUploadBox: React.FC<FileUploadBoxProps> = ({
  onFilesChange,
  acceptedFileTypes,
  maxFiles = 1,
  className,
  disabled = false,
}) => {
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setError(null); // エラーをリセット

    if (fileRejections.length > 0) {
      const rejection = fileRejections[0].errors[0];
      if (rejection.code === 'file-too-large') {
        setError('ファイルサイズが大きすぎます。');
      } else if (rejection.code === 'file-invalid-type') {
        setError('無効なファイル形式です。');
      } else if (rejection.code === 'too-many-files') {
        setError(`${maxFiles}個までのファイルしか選択できません。`);
      } else {
        setError('ファイルの選択に失敗しました。');
      }
      onFilesChange([]); // エラー時はファイルをクリア
      setCurrentFiles([]);
      return;
    }

    if (acceptedFiles.length > maxFiles) {
      setError(`${maxFiles}個までのファイルしか選択できません。`);
      onFilesChange([]);
      setCurrentFiles([]);
      return;
    }

    setCurrentFiles(acceptedFiles);
    onFilesChange(acceptedFiles);
  }, [onFilesChange, maxFiles]);

  const { getRootProps, getInputProps, isDragActive, isFocused } = useDropzone({
    onDrop,
    accept: acceptedFileTypes ? Object.fromEntries(acceptedFileTypes.split(',').map(ext => [ext.trim(), []])) : undefined,
    maxFiles: maxFiles,
    disabled: disabled,
    noClick: disabled, // disabled時はクリックでファイル選択できないようにする
    noDrag: disabled,   // disabled時はドラッグ&ドロップできないようにする
  });

  const removeFile = (fileToRemove: File) => {
    const updatedFiles = currentFiles.filter(file => file !== fileToRemove);
    setCurrentFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setError(null); // ファイルを削除したらエラーもリセット
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-200",
          "h-64 md:h-80", // ★★★ 高さを大きく変更 ★★★
          "focus:outline-none",
          disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-300" : "bg-white text-gray-600 hover:border-green-500 hover:bg-green-50",
          (isDragActive || isFocused) && !disabled ? "border-green-600 bg-green-50" : "border-gray-300",
          error && "border-red-500 bg-red-50 text-red-700"
        )}
      >
        <input {...getInputProps()} disabled={disabled} />
        <UploadCloud className={cn("w-12 h-12 mb-3", disabled ? "text-gray-400" : "text-gray-500 group-hover:text-green-600", error && "text-red-600")} />
        {isDragActive && !disabled ? (
          <p className="font-semibold text-green-700">ここにドロップしてください...</p>
        ) : (
          <p className={cn("font-medium", disabled ? "text-gray-400" : "text-gray-600", error && "text-red-700")}>
            ファイルをここにドラッグアンドドロップ
            <br />
            またはクリックで場所を指定
          </p>
        )}
        {error && <p className="text-red-700 text-sm mt-2">{error}</p>}
      </div>

      {currentFiles.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="font-semibold text-gray-700">選択中のファイル:</p>
          {currentFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-gray-50 text-sm">
              <span className="truncate pr-2">{file.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(file); }}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
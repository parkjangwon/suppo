"use client";

import { useState, useRef } from "react";
import { X, Upload } from "lucide-react";

interface AttachmentUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  inputAriaLabel?: string;
}

export function AttachmentUpload({
  files,
  onChange,
  maxFiles = 20,
  maxSize = 10 * 1024 * 1024,
  inputAriaLabel,
}: AttachmentUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
  };

  const processFiles = (newFiles: File[]) => {
    setError(null);

    if (files.length + newFiles.length > maxFiles) {
      setError(`최대 ${maxFiles}개의 파일만 첨부할 수 있습니다.`);
      return;
    }

    const validFiles = newFiles.filter((file) => {
      if (file.size > maxSize) {
        setError(`파일 크기는 10MB를 초과할 수 없습니다: ${file.name}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onChange([...files, ...validFiles]);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          클릭하거나 파일을 여기로 드래그하여 업로드하세요
        </p>
        <p className="text-xs text-gray-500 mt-1">
          최대 {maxFiles}개, 각 파일당 최대 10MB
        </p>
        <input
          type="file"
          ref={fileInputRef}
          aria-label={inputAriaLabel}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="text-sm font-medium text-gray-700 truncate">
                  {file.name}
                </span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

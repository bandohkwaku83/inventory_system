'use client';

import React, { useRef } from 'react';
import { PictureOutlined, CloseOutlined } from '@ant-design/icons';
import { Typography, Space } from 'antd';

const { Text } = Typography;

const MAX_SIZE_MB = 2;
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

interface ImageUploadProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
}

export default function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Image must be under ${MAX_SIZE_MB}MB`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChange?.(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-teal-300 hover:bg-teal-50/50 overflow-hidden relative ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      {value ? (
        <>
          <img
            src={value}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain object-center bg-white"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-slate-800/70 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
              aria-label="Remove image"
            >
              <CloseOutlined className="text-xs" />
            </button>
          )}
        </>
      ) : (
        <Space direction="vertical" align="center" size={0}>
          <PictureOutlined className="text-2xl" />
          <Text type="secondary">Click to upload (optional, max {MAX_SIZE_MB}MB)</Text>
        </Space>
      )}
    </div>
  );
}

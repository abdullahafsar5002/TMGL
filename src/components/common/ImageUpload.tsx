import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadImage, deleteImage } from '@/lib/storage';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateClient(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'team-logos',
  folder = 'logos',
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const clientError = validateClient(file);
      if (clientError) {
        setError(clientError);
        return;
      }
      setError(null);
      setIsUploading(true);

      const result = await uploadImage(file, bucket, folder);
      setIsUploading(false);

      if (result.error) {
        setError(result.error);
      } else {
        onChange(result.data);
      }
    },
    [bucket, folder, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = async () => {
    if (value) {
      const url = new URL(value);
      const path = url.pathname.split('/object/signing/')[1] ?? value.split('/').slice(-2).join('/');
      await deleteImage(bucket, path);
    }
    onChange(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-24 h-24 rounded-lg object-cover border border-tmgl-charcoal-200"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center w-48 h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
            disabled
              ? 'border-tmgl-charcoal-200 bg-tmgl-charcoal-50 cursor-not-allowed opacity-50'
              : dragOver
                ? 'border-tmgl-green-700 bg-tmgl-green-50'
                : 'border-tmgl-charcoal-300 bg-tmgl-charcoal-50 hover:border-tmgl-green-600 hover:bg-tmgl-green-50'
          )}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-tmgl-charcoal-400 mb-1.5" />
              <span className="text-xs text-tmgl-charcoal-500 text-center px-2">
                Drop image or click to browse
              </span>
              <span className="text-xs text-tmgl-charcoal-400 mt-0.5">JPG, PNG, WebP up to 5 MB</span>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}

import React, { useRef } from 'react';
import { Camera, X, Loader } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { AgriButton } from '@/components/ui/agri-button';
import { dialogService } from '@/core/services/DialogService';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onError?: (error: string) => void;
  bucket?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, onError, bucket = 'cattle-images' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, deleteImage, uploading } = useImageUpload(bucket);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImage(file);
      if (url) {
        onChange(url);
      }
    } catch (error: any) {
      onError?.(error.message);
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    const confirmed = await dialogService.confirm({
      title: 'Remove photo?',
      description: 'This photo will be permanently deleted from your listing.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteImage(value);
      onChange('');
    } catch (error: any) {
      onError?.(error.message || 'Failed to remove photo. Please try again.');
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground mb-1 block">Photo</label>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove image"
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-2"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <AgriButton
          type="button"
          variant="outline"
          className="w-full h-24 flex-col gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader className="animate-spin" size={24} />
              <span className="text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <Camera size={24} />
              <span className="text-sm">Take Photo or Upload</span>
            </>
          )}
        </AgriButton>
      )}
    </div>
  );
};

export default ImageUpload;

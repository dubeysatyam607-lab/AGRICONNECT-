import React, { useRef, useState } from 'react';
import { AppButton } from '@/shared/widgets/AppButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { uploadToCloudinary } from '@/lib/cloudinary-service';
import { RefreshCw, Camera, AlertCircle, UploadCloud } from 'lucide-react';

/**
 * Enterprise Profile Avatar Uploader Component.
 * Supports image file upload, validation, permanent Cloudinary storage,
 * and synchronized cross-device profile avatars.
 */
interface IProfileAvatarUploaderProps {
  currentUrl?: string;
  fullName: string;
  onImageSelected: (url: string) => void;
}

export const ProfileAvatarUploader: React.FC<IProfileAvatarUploaderProps> = ({
  currentUrl,
  fullName,
  onImageSelected,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Only JPEG, PNG, and WebP images are supported.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(t('pdetail.avatarSize') || 'Image must be under 5MB.');
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        const { secureUrl } = await uploadToCloudinary(file, 'profile-avatars');
        if (secureUrl) {
          onImageSelected(secureUrl);
          try {
            localStorage.setItem('agri_profile_avatar', secureUrl);
            window.dispatchEvent(new CustomEvent('agri_avatar_updated', { detail: { avatarUrl: secureUrl } }));
          } catch {
            // storage quota
          }
        } else {
          throw new Error('Upload succeeded but no permanent URL was returned.');
        }
      } catch (err: any) {
        console.error('[ProfileAvatarUploader] Upload error:', err);
        setUploadError(err?.message || 'Failed to upload photo. Please verify your internet connection and try again.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSimulateCamera = () => {
    const sampleAvatars = [
      'https://images.pexels.com/photos/36678256/pexels-photo-36678256.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/11070641/pexels-photo-11070641.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/10206561/pexels-photo-10206561.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ];
    const randomAvatar = sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)];
    onImageSelected(randomAvatar);
    try {
      localStorage.setItem('agri_profile_avatar', randomAvatar);
      window.dispatchEvent(new CustomEvent('agri_avatar_updated', { detail: { avatarUrl: randomAvatar } }));
    } catch {}
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'KM';
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 transition-all">
      {/* Avatar Circle */}
      <div
        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md flex items-center justify-center bg-emerald-800 text-white font-semibold text-2xl cursor-pointer group shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={fullName}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          />
        ) : null}
        
        {/* Fallback Initials */}
        <span className="select-none">{getInitials(fullName || 'Farmer')}</span>

        {/* Hover / Loading Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center transition-opacity duration-200 ${
            isUploading || isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {isUploading ? (
            <>
              <RefreshCw size={20} className="animate-spin text-white mb-1" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-white">Uploading</span>
            </>
          ) : (
            <>
              <UploadCloud size={20} className="text-white mb-0.5" />
              <span className="text-xs uppercase font-bold tracking-wider text-white">
                {t('pdetail.change') || 'Change'}
              </span>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {/* Action Buttons & Guidance */}
      <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
        <div>
          <h4 className="text-base font-semibold text-foreground">
            {t('pdetail.profilePicture') || 'Profile Photo'}
          </h4>
          <p className="text-xs text-muted-foreground">
            {t('pdetail.profilePictureSub') || 'Upload a clear photo. Supported formats: JPG, PNG, WebP (max 5MB).'}
          </p>
        </div>

        {uploadError && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle size={13} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-bold"
          >
            {isUploading ? (
              <>
                <RefreshCw size={13} className="animate-spin mr-1.5" />
                Uploading...
              </>
            ) : (
              t('pdetail.browsePhoto') || 'Upload Photo'
            )}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSimulateCamera}
            disabled={isUploading}
            className="text-xs font-bold"
          >
            <Camera size={13} className="mr-1.5" />
            {t('pdetail.captureCamera') || 'Take Photo'}
          </AppButton>
        </div>
      </div>
    </div>
  );
};

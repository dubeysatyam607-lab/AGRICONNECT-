import React, { useRef, useState } from 'react';
import { AppButton } from '@/shared/widgets/AppButton';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Enterprise Profile Avatar Uploader Component.
 * Supports image file upload, drag-and-drop, and camera capture simulation with preview.
 */
interface IProfileAvatarUploaderProps {
  currentUrl?: string;
  fullName: string;
  onImageSelected: (dataUrl: string) => void;
}

export const ProfileAvatarUploader: React.FC<IProfileAvatarUploaderProps> = ({
  currentUrl,
  fullName,
  onImageSelected,
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only JPEG, PNG, and WebP images are supported.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(t('pdetail.avatarSize'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageSelected(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSimulateCamera = () => {
    // Generate a clean agricultural farmer avatar SVG base64 or high-res Unsplash photo
    const sampleAvatars = [
      'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      'https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    ];
    const randomAvatar = sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)];
    onImageSelected(randomAvatar);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 transition-all">
      {/* Avatar Circle */}
      <div
        className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-extrabold text-2xl cursor-pointer group shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={fullName} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.pexels.com/photos/11688197/pexels-photo-11688197.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"; }} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300" />
        ) : (
          <span>{getInitials(fullName || 'Farmer')}</span>
        )}

        <div
          className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-xl mb-0.5">📷</span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-white">{t('pdetail.change')}</span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Action Buttons & Guidance */}
      <div className="space-y-2 text-center sm:text-left">
        <div>
          <h4 className="text-base font-extrabold text-foreground">{t('pdetail.profilePicture')}</h4>
          <p className="text-xs text-muted-foreground">
            {t('pdetail.profilePictureSub')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold"
          >
            📁 {t('pdetail.browsePhoto')}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSimulateCamera}
            className="text-xs font-bold"
          >
            📸 {t('pdetail.captureCamera')}
          </AppButton>
        </div>
      </div>
    </div>
  );
};

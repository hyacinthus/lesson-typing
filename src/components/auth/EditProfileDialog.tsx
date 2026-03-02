import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, User, Camera, Upload, Check, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { getCroppedImg } from '../../utils/canvasUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Crop state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [pendingUploadBlob, setPendingUploadBlob] = useState<Blob | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      setNickname(profile?.nickname || user.user_metadata?.full_name || '');
      setAvatarUrl(profile?.avatar_url || user.user_metadata?.avatar_url || '');
      // Reset crop state
      setImageSrc(null);
      setIsCropping(false);
      setPendingUploadBlob(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  }, [open, user, profile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
      // Reset input value to allow selecting same file again
      event.target.value = '';
    }
  };

  const onCropComplete = (_: PixelCrop, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setImageSrc(null);
    setPendingUploadBlob(null);
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) return;

      setPendingUploadBlob(croppedBlob);
      const objectUrl = URL.createObjectURL(croppedBlob);
      setAvatarUrl(objectUrl);
      setIsCropping(false);
    } catch (e) {
      console.error(e);
      toast.error(t('auth.profile.error'));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    console.log('Starting handleSave...', { nickname, avatarUrl });
    try {
      setLoading(true);
      let finalAvatarUrl = avatarUrl;

      // Upload blob if exists
      if (pendingUploadBlob && user) {
        console.log('Uploading new avatar...');
        const fileExt = 'jpg'; // We output jpeg from canvas
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, pendingUploadBlob, {
            upsert: true,
            contentType: 'image/jpeg',
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalAvatarUrl = data.publicUrl;
        console.log('Avatar uploaded:', finalAvatarUrl);
      }

      // Update lt_profiles table
      const updates = {
        id: user.id,
        nickname: nickname,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      console.log('Updating lt_profiles...', updates);
      const { error } = await supabase
        .from('lt_profiles')
        .upsert(updates);

      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }
      
      console.log('Profile updated in DB, updating auth metadata...');
      // Also update user metadata for consistency (optional but helpful)
      await supabase.auth.updateUser({
        data: {
          full_name: nickname,
          avatar_url: finalAvatarUrl,
        },
      });

      console.log('Closing dialog and refreshing profile...');
      onOpenChange(false);
      await refreshProfile();
      toast.success(t('auth.profile.success'));
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('auth.profile.error'));
    } finally {
      console.log('handleSave finished');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isCropping ? t('auth.profile.crop_title', 'Crop Image') : t('auth.profile.title')}</DialogTitle>
          <DialogDescription>
            {isCropping ? t('auth.profile.crop_description', 'Drag to reposition and use the slider to zoom.') : t('auth.profile.description', 'Update your profile information here.')}
          </DialogDescription>
        </DialogHeader>

        {isCropping ? (
          <div className="flex flex-col h-[400px]">
            <div className="relative flex-1 bg-black w-full rounded-md overflow-hidden mb-4">
              <Cropper
                image={imageSrc || ''}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">Zoom</span>
                <Slider 
                  value={[zoom]} 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  onValueChange={(value) => setZoom(value[0])}
                  className="flex-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCropCancel}>
                  <X className="mr-2 h-4 w-4" />
                  {t('auth.profile.cancel')}
                </Button>
                <Button onClick={handleCropConfirm}>
                  <Check className="mr-2 h-4 w-4" />
                  {t('auth.profile.confirm')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <div 
                  className="relative cursor-pointer group rounded-full overflow-hidden" 
                  onClick={handleAvatarClick}
                >
                  <Avatar className="h-24 w-24 border-2 border-gray-100">
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-12 w-12 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAvatarClick} 
                  disabled={loading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t('auth.profile.upload_avatar')}
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nickname">{t('auth.profile.nickname')}</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('auth.profile.nickname_placeholder')}
                  disabled={loading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {t('auth.profile.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.profile.save')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

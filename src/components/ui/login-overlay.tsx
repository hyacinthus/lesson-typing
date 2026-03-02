import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoginOverlayProps {
  isVisible: boolean;
}

export function LoginOverlay({ isVisible }: LoginOverlayProps) {
  const { t } = useTranslation();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center rounded-xl bg-white p-8 shadow-xl">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-base font-medium text-gray-700">{t('auth.signing_in')}</p>
      </div>
    </div>
  );
}

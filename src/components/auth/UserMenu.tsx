import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, LogOut, MessageSquare, User, UserCog } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { EditProfileDialog } from './EditProfileDialog';
import { PersonalStatsDialog } from './PersonalStatsDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export function UserMenu() {
  const { t } = useTranslation();
  const { user, profile, isLoading, isProfileLoaded, signOut, setLoginDialogOpen } = useAuthStore();
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  if (isLoading || (user && !isProfileLoaded)) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        onClick={() => setLoginDialogOpen(true)}
        className="h-10 rounded-full border-gray-100 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm hover:bg-white hover:shadow-md"
      >
        <span>{t('auth.login')}</span>
      </Button>
    );
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const displayName = profile?.nickname || user?.user_metadata?.full_name || user?.email;

  return (
    <>
      <PersonalStatsDialog open={isStatsOpen} onOpenChange={setIsStatsOpen} />
      <EditProfileDialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen} />
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-100 bg-white p-5 shadow-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-800">{t('auth.feedback_title')}</DialogTitle>
            <DialogDescription className="text-gray-500">
              {t('auth.feedback_description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsFeedbackOpen(false)}
              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {t('auth.profile.cancel')}
            </Button>
            <Button
              onClick={() => {
                window.open('https://github.com/hyacinthus/lesson-typing/issues', '_blank');
                setIsFeedbackOpen(false);
              }}
              className="rounded-xl bg-primary text-white hover:bg-primary/90"
            >
              {t('auth.feedback_go_github')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 rounded-full border-gray-100 bg-white p-1 pr-3 text-sm font-medium text-gray-600 shadow-sm hover:bg-white hover:shadow-md"
          >
            <Avatar className="size-7">
              <AvatarImage src={avatarUrl} alt="avatar" className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User size={16} />
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl border-gray-100 bg-white py-2">
          <DropdownMenuLabel className="truncate text-xs text-gray-400">{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-3"
            onSelect={() => setIsStatsOpen(true)}
          >
            <BarChart3 size={18} />
            <span>{t('auth.my_stats')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3"
            onSelect={() => setIsEditProfileOpen(true)}
          >
            <UserCog size={18} />
            <span>{t('auth.edit_profile')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-3"
            onSelect={() => setIsFeedbackOpen(true)}
          >
            <MessageSquare size={18} />
            <span>{t('auth.feedback')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void signOut().catch((error) => {
                console.error('Sign-out failed:', error);
              });
            }}
            className="gap-3"
          >
            <LogOut size={18} />
            <span>{t('auth.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

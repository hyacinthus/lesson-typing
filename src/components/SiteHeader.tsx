import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelect } from './LanguageSelect';
import { UserMenu } from './auth/UserMenu';

interface SiteHeaderProps {
  /** Wide screens: the middle of the bar, e.g. the collection picker. */
  center?: ReactNode;
  /** Narrow screens: before the language picker in the bar's second row. */
  mobileRow?: ReactNode;
}

/** The top bar of the home and download pages. */
export function SiteHeader({ center, mobileRow }: SiteHeaderProps) {
  const { lang = 'en' } = useParams<{ lang: string }>();

  return (
    <div className="sticky top-0 bg-header text-header-foreground shadow-sm px-4 py-3 md:px-6 md:py-4 z-10" data-nosnippet>
      {/* Row 1: Logo + UserMenu (mobile) / Full row (desktop) */}
      <div className="flex items-center justify-between gap-3">
        <Link to={`/${lang}/`} className="flex items-center gap-2 md:gap-3 md:w-1/3 shrink-0">
          <Logo className="w-8 h-8 md:w-10 md:h-10" />
          <span className="text-lg md:text-xl font-bold tracking-tight">Lesson Typing</span>
        </Link>

        <div className="hidden md:flex justify-center w-1/3">{center}</div>

        {/* Desktop: Language Switcher & Auth */}
        <div className="hidden md:flex justify-end items-center gap-4 w-1/3">
          <LanguageSelect className="h-10 min-w-[150px] px-4 focus-visible:ring-primary/50" />
          <ThemeToggle />
          <UserMenu />
        </div>

        {/* Mobile: UserMenu only in row 1 */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle className="size-9" />
          <UserMenu />
        </div>
      </div>

      {/* Row 2: Mobile only */}
      <div className="flex md:hidden items-center gap-2 mt-2">
        {mobileRow}
        <LanguageSelect className="h-9 w-24 shrink-0 px-3" />
      </div>
    </div>
  );
}

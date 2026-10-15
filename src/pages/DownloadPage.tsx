import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppWindowMac, Check, CloudCheck, Copy, Download, ExternalLink, Keyboard, Monitor, RefreshCw, RotateCcw, Shuffle,
  SquareTerminal, type LucideIcon,
} from 'lucide-react';
import { SiteHeader } from '../components/SiteHeader';
import { TypingDemo } from '../components/TypingDemo';
import { FeatureGrid } from '../components/FeatureGrid';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { cn, ctaClass } from '@/lib/utils';
import {
  ALL_RELEASES_URL, LATEST_RELEASE_URL, LINUX_INSTALL_COMMAND, cachedRelease, detectDownload, fetchDesktopRelease,
  type DesktopRelease, type DownloadId, type ReleaseAsset,
} from '@/lib/desktopRelease';

interface PlatformInfo {
  id: DownloadId;
  name: string;
  icon: LucideIcon;
  requirement: string;
  /** The installer's kind, e.g. a disk image. */
  file: string;
  /** Installs the app from a terminal, on the systems the installer is not for. */
  installCommand?: string;
  firstOpen?: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'mac',
    name: 'macOS',
    icon: AppWindowMac,
    requirement: 'download.mac_requirement',
    file: 'download.mac_dmg',
    // The app is not notarized
    firstOpen: 'download.mac_first_open',
  },
  {
    id: 'windows',
    name: 'Windows',
    icon: Monitor,
    requirement: 'download.windows_requirement',
    file: 'download.windows_installer',
    // Nor is the installer signed, which SmartScreen warns about
    firstOpen: 'download.windows_first_open',
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: SquareTerminal,
    requirement: 'download.linux_requirement',
    file: 'download.linux_deb',
    installCommand: LINUX_INSTALL_COMMAND,
  },
];

/** A download's link: the file, or the release's page until it is known. */
function linkProps(asset: ReleaseAsset | undefined) {
  return asset ? { href: asset.url } : { href: LATEST_RELEASE_URL, target: '_blank', rel: 'noreferrer' };
}

function formatSize(bytes: number, lang: string) {
  return new Intl.NumberFormat(lang, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 }).format(bytes / 1e6);
}

/** The desktop app's download page. */
export function DownloadPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [release, setRelease] = useState(cachedRelease);
  const detected = detectDownload(navigator.userAgent, navigator.maxTouchPoints);

  useEffect(() => {
    if (release) return;
    fetchDesktopRelease().then(setRelease, () => {
      /* the links go to the release's page */
    });
  }, [release]);

  useDocumentTitle(t('download.title'));

  const recommended = PLATFORMS.find((p) => p.id === detected);
  const recommendedAsset = recommended && release?.downloads[recommended.id];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex flex-col items-center px-4 pt-14 md:pt-20 pb-12">
        <h1 className="text-3xl md:text-5xl leading-tight font-medium tracking-wide text-center">{t('download.title')}</h1>
        <p className="mt-4 max-w-xl text-center text-balance text-muted-foreground md:text-lg">{t('download.subtitle')}</p>

        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          {recommended ? (
            <>
              <a
                {...linkProps(recommendedAsset)}
                className={cn(ctaClass, 'inline-flex items-center gap-2 px-8 py-3 text-lg md:text-xl')}
              >
                <Download className="size-5" />
                {t('download.button', { platform: recommended.name })}
              </a>
              <p className="text-sm text-muted-foreground">
                {[
                  release && t('download.version', { version: release.version }),
                  t(recommended.file),
                  recommendedAsset && formatSize(recommendedAsset.size, lang),
                ].filter(Boolean).join(' · ')}
              </p>
            </>
          ) : detected === 'mobile' ? (
            <p className="max-w-md text-muted-foreground">{t('download.mobile_note')}</p>
          ) : null}
        </div>

        <WindowPreview key={lang} />
      </main>

      <section className="px-4 pb-12">
        <FeatureGrid
          features={[
            { icon: Keyboard, title: t('download.feature_native'), description: t('download.feature_native_desc') },
            { icon: CloudCheck, title: t('download.feature_sync'), description: t('download.feature_sync_desc') },
            { icon: RefreshCw, title: t('download.feature_updates'), description: t('download.feature_updates_desc') },
          ]}
        />
      </section>

      <section className="px-4 pb-16">
        <h2 className="mb-6 text-xl md:text-2xl font-medium text-center">{t('download.all_platforms')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              release={release}
              highlighted={platform === recommended}
            />
          ))}
        </div>

        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {release && (
            <>
              <span>
                {t('download.version', { version: release.version })} ·{' '}
                <time dateTime={release.publishedAt}>
                  {new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(release.publishedAt))}
                </time>
              </span>
              <ExternalAnchor href={release.url}>{t('download.release_notes')}</ExternalAnchor>
            </>
          )}
          <ExternalAnchor href={ALL_RELEASES_URL}>{t('download.all_versions')}</ExternalAnchor>
        </p>
      </section>
    </div>
  );
}

/** A picture of the app's window, typing the home page's sample line. */
function WindowPreview() {
  return (
    <div className="mt-12 md:mt-16 w-full max-w-3xl overflow-hidden rounded-2xl border bg-card shadow-xl" aria-hidden="true">
      <div className="flex items-center gap-4 h-12 px-4 border-b">
        <div className="flex gap-2">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FEBC2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </div>
        <span className="flex-1 truncate text-sm font-semibold">Lesson Typing</span>
        <div className="flex items-center gap-3 rounded-full border bg-background px-3 py-1 text-muted-foreground">
          <Shuffle className="size-4" />
          <RotateCcw className="size-4" />
        </div>
      </div>
      <div className="px-6 py-14 md:py-20">
        <TypingDemo />
      </div>
    </div>
  );
}

interface PlatformCardProps {
  platform: PlatformInfo;
  release: DesktopRelease | null;
  highlighted: boolean;
}

function PlatformCard({ platform, release, highlighted }: PlatformCardProps) {
  const { t, i18n } = useTranslation();
  const Icon = platform.icon;
  const asset = release?.downloads[platform.id];

  return (
    <div className={cn('flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm', highlighted && 'border-primary ring-1 ring-primary')}>
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="size-5 text-primary" />
          {platform.name}
        </h3>
        <p className="text-sm text-muted-foreground">{t(platform.requirement)}</p>
      </div>

      <Button
        variant="outline"
        className="h-auto justify-between gap-3 whitespace-normal rounded-xl px-4 py-2.5 hover:border-primary hover:text-primary"
        asChild
      >
        <a {...linkProps(asset)}>
          <span className="flex items-center gap-2">
            <Download className="shrink-0" />
            {t(platform.file)}
          </span>
          {asset && <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">{formatSize(asset.size, i18n.language)}</span>}
        </a>
      </Button>

      {platform.installCommand && <InstallCommand command={platform.installCommand} />}
      {platform.firstOpen && <p className="text-xs leading-relaxed text-muted-foreground">{t(platform.firstOpen)}</p>}
    </div>
  );
}

/** A command that installs the app, to copy. */
function InstallCommand({ command }: { command: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const label = copied ? t('download.copied') : t('download.copy');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t('download.linux_script')}</p>
      <div className="flex items-start gap-1 rounded-xl bg-muted py-2 pl-3 pr-1">
        <code className="flex-1 py-1 break-all select-all font-mono text-xs leading-relaxed">{command}</code>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          title={label}
          // The clipboard needs a secure context; the command can be selected anyway
          onClick={() => navigator.clipboard?.writeText(command).then(() => setCopied(true), () => {})}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
        <span role="status" className="sr-only">{copied ? t('download.copied') : ''}</span>
      </div>
    </div>
  );
}

function ExternalAnchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
      {children}
      <ExternalLink className="size-3.5" />
    </a>
  );
}

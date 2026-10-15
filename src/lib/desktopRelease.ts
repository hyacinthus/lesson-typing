import { safeStorage } from './storage';

/**
 * The desktop app's downloads, from the newest GitHub release that has all
 * its installers: .github/workflows/desktop-release.yml attaches them, one
 * system after another, some minutes after the release is published.
 */
const REPO = 'hyacinthus/lesson-typing';
const API_URL = `https://api.github.com/repos/${REPO}/releases?per_page=3`;

/** The latest release's page, where every download is when the API fails. */
export const LATEST_RELEASE_URL = `https://github.com/${REPO}/releases/latest`;
export const ALL_RELEASES_URL = `https://github.com/${REPO}/releases`;
/** Installs the latest version for the user on any Linux distribution. */
export const LINUX_INSTALL_COMMAND = `curl -fsSL ${LATEST_RELEASE_URL}/download/install.sh | sh`;

// The installers' names, as the release workflow attaches them, e.g.
// Lesson-Typing-0.22.0-macOS.dmg, Lesson-Typing-Setup-0.22.0-windows-x64.exe
// and lesson-typing_0.22.0_amd64.deb. The ARM builds of Windows and Linux are
// left out: Windows on ARM runs the x64 app, and install.sh picks the ARM
// build on Linux.
const ASSET_NAMES = {
  mac: /-macOS\.dmg$/,
  windows: /-windows-x64\.exe$/,
  linux: /_amd64\.deb$/,
} satisfies Record<string, RegExp>;

export type DownloadId = keyof typeof ASSET_NAMES;

export interface ReleaseAsset {
  url: string;
  size: number;
}

export interface DesktopRelease {
  version: string;
  publishedAt: string;
  url: string;
  downloads: Partial<Record<DownloadId, ReleaseAsset>>;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  html_url: string;
  assets: { name: string; size: number; browser_download_url: string }[];
}

function parseRelease(release: GitHubRelease): DesktopRelease {
  const downloads: DesktopRelease['downloads'] = {};
  for (const [id, name] of Object.entries(ASSET_NAMES) as [DownloadId, RegExp][]) {
    const asset = release.assets.find((a) => name.test(a.name));
    if (asset) downloads[id] = { url: asset.browser_download_url, size: asset.size };
  }
  return {
    version: release.tag_name.replace(/^v/, ''),
    publishedAt: release.published_at,
    url: release.html_url,
    downloads,
  };
}

/** The newest published release with all the installers, of the newest releases first. */
export function pickRelease(releases: GitHubRelease[]): DesktopRelease | null {
  for (const release of releases) {
    if (release.draft || release.prerelease) continue;
    const parsed = parseRelease(release);
    if (Object.keys(parsed.downloads).length === Object.keys(ASSET_NAMES).length) return parsed;
  }
  return null;
}

// GitHub allows 60 unauthenticated API calls an hour per IP address, which
// visitors behind one address (a school) share: each browser asks once an
// hour. When the limit is reached, the links go to the release's page.
const CACHE_KEY = 'lesson-typing-desktop-release';
const CACHE_MS = 60 * 60 * 1000;

/** The release this browser fetched in the last hour. */
export function cachedRelease(): DesktopRelease | null {
  try {
    const cached = JSON.parse(safeStorage.get(CACHE_KEY) ?? 'null');
    if (Date.now() - cached?.at < CACHE_MS && typeof cached.release?.version === 'string') {
      return cached.release;
    }
  } catch {
    /* fetched again */
  }
  return null;
}

export async function fetchDesktopRelease(): Promise<DesktopRelease> {
  const cached = cachedRelease();
  if (cached) return cached;
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
  const release = pickRelease(await response.json());
  if (!release) throw new Error('No release has installers');
  safeStorage.set(CACHE_KEY, JSON.stringify({ at: Date.now(), release }));
  return release;
}

/**
 * The download that suits the visitor's computer, from the browser's user
 * agent: 'mobile' on phones and tablets, null where there is none (ChromeOS,
 * unknown systems).
 */
export function detectDownload(userAgent: string, maxTouchPoints = 0): DownloadId | 'mobile' | null {
  if (/Android|iPhone|iPad|iPod/.test(userAgent)) return 'mobile';
  // iPadOS asks for desktop sites as a Mac; Macs have no touch screen
  if (/Macintosh/.test(userAgent)) return maxTouchPoints > 1 ? 'mobile' : 'mac';
  if (/Windows/.test(userAgent)) return 'windows';
  if (/CrOS/.test(userAgent)) return null;
  if (/Linux/.test(userAgent)) return 'linux';
  return null;
}

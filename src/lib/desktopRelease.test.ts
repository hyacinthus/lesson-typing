import { describe, expect, it } from 'vitest';
import { detectDownload, pickRelease, type DownloadId } from './desktopRelease';

// The assets of v0.22.0
const NAMES = [
  'install.sh',
  'lesson-typing-0.22.0-darwin-universal.tar.gz',
  'lesson-typing-0.22.0-linux-amd64.tar.gz',
  'lesson-typing-0.22.0-linux-arm64.tar.gz',
  'Lesson-Typing-0.22.0-macOS.dmg',
  'lesson-typing-0.22.0-windows-amd64.tar.gz',
  'lesson-typing-0.22.0-windows-arm64.tar.gz',
  'Lesson-Typing-Setup-0.22.0-windows-arm64.exe',
  'Lesson-Typing-Setup-0.22.0-windows-x64.exe',
  'lesson-typing_0.22.0_amd64.deb',
  'lesson-typing_0.22.0_arm64.deb',
  'update-darwin-universal.json',
  'update-windows-amd64.json',
];

function release(tag: string, names: string[], options: { draft?: boolean; prerelease?: boolean } = {}) {
  return {
    tag_name: tag,
    draft: options.draft ?? false,
    prerelease: options.prerelease ?? false,
    published_at: '2026-10-12T12:00:00Z',
    html_url: `https://github.com/hyacinthus/lesson-typing/releases/tag/${tag}`,
    assets: names.map((name, i) => ({ name, size: i, browser_download_url: `https://example.com/${tag}/${name}` })),
  };
}

describe('pickRelease', () => {
  it('finds each installer', () => {
    const picked = pickRelease([release('v0.22.0', NAMES)])!;
    const fileOf = (id: DownloadId) => picked.downloads[id]?.url.split('/').pop();
    expect(picked.version).toBe('0.22.0');
    expect(fileOf('mac')).toBe('Lesson-Typing-0.22.0-macOS.dmg');
    expect(fileOf('windows')).toBe('Lesson-Typing-Setup-0.22.0-windows-x64.exe');
    expect(fileOf('linux')).toBe('lesson-typing_0.22.0_amd64.deb');
    expect(picked.downloads.mac?.size).toBe(NAMES.indexOf('Lesson-Typing-0.22.0-macOS.dmg'));
  });

  it('skips releases whose installers are not all attached yet, and prereleases', () => {
    const picked = pickRelease([
      release('v0.24.0-beta', NAMES, { prerelease: true }),
      release('v0.23.0', ['lesson-typing_0.23.0_amd64.deb']),
      release('v0.22.0', NAMES),
    ]);
    expect(picked?.version).toBe('0.22.0');
  });

  it('finds nothing without installers', () => {
    expect(pickRelease([release('v0.19.0', ['install.sh'])])).toBeNull();
    expect(pickRelease([])).toBeNull();
  });
});

describe('detectDownload', () => {
  it.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', 0, 'mac'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 0, 'windows'],
    ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 0, 'linux'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36', 5, 'mobile'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 5, 'mobile'],
    // An iPad asking for the desktop site
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 5, 'mobile'],
    ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 0, null],
  ])('%s', (userAgent, touchPoints, expected) => {
    expect(detectDownload(userAgent, touchPoints)).toBe(expected);
  });
});

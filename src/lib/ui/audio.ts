/**
 * Audio playback.
 *
 * Two rules shape this module.
 *
 * First, clips are files we ship, never the Web Speech API. Bengali voice
 * coverage in `speechSynthesis` depends entirely on OS-installed voices and
 * is absent on most iOS devices, so relying on it would make pronunciation
 * work on some phones and silently vanish on others.
 *
 * Second, a missing clip is a normal state, not an error. The course is
 * being recorded incrementally, so the app has to stay fully usable while
 * most items have no audio — exercises that *require* sound are withheld
 * rather than served broken.
 */

const cache = new Map<string, HTMLAudioElement>();

/** Clips live under /audio; content stores paths relative to that. */
export function audioUrl(path: string | undefined, base = ''): string | null {
  if (!path) return null;
  return `${base}/audio/${path}`;
}

export function canPlay(path: string | undefined): boolean {
  return Boolean(path);
}

/**
 * Play a clip. Resolves when playback finishes, or immediately if there is
 * nothing to play — callers never have to special-case a missing file.
 */
export async function play(path: string | undefined, base = ''): Promise<void> {
  const url = audioUrl(path, base);
  if (!url) return;

  let el = cache.get(url);
  if (!el) {
    el = new Audio(url);
    el.preload = 'auto';
    cache.set(url, el);
  }

  try {
    el.currentTime = 0;
    await el.play();
  } catch {
    // Autoplay policies reject playback that isn't user-initiated. That is
    // expected on first load and is not worth surfacing.
    return;
  }

  await new Promise<void>((resolve) => {
    const done = () => {
      el!.removeEventListener('ended', done);
      el!.removeEventListener('error', done);
      resolve();
    };
    el!.addEventListener('ended', done);
    el!.addEventListener('error', done);
  });
}

/** Warm the cache so the first tap doesn't wait on the network. */
export function preload(paths: Array<string | undefined>, base = ''): void {
  for (const p of paths) {
    const url = audioUrl(p, base);
    if (!url || cache.has(url)) continue;
    const el = new Audio(url);
    el.preload = 'auto';
    cache.set(url, el);
  }
}

/**
 * Install and notification prompts.
 *
 * Installing is load-bearing rather than cosmetic: on iOS the Push API is
 * only available to a web app added to the Home Screen, so notification
 * adoption is capped by install rate. The two are presented together for
 * that reason.
 *
 * iOS also gives no programmatic install trigger — no `beforeinstallprompt`
 * — so Safari users get instructions instead of a button. Detecting that
 * and saying so plainly beats showing a button that does nothing.
 */

import { browser } from '$app/environment';
import { base } from '$app/paths';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios-safari' | 'prompt-capable' | 'installed' | 'unsupported';

class Install {
  platform = $state<Platform>('unsupported');
  pushPermission = $state<NotificationPermission | 'unsupported'>('unsupported');
  subscribed = $state(false);
  message = $state<string | null>(null);

  private deferred: BeforeInstallPromptEvent | null = null;

  init() {
    if (!browser) return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS exposes standalone off navigator rather than via display-mode.
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS reports as Mac; the touch check distinguishes it.
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (standalone) this.platform = 'installed';
    else if (isIOS) this.platform = 'ios-safari';
    else this.platform = 'unsupported';

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      if (this.platform !== 'installed') this.platform = 'prompt-capable';
    });

    this.pushPermission = 'Notification' in window ? Notification.permission : 'unsupported';
    void this.refreshSubscription();
  }

  private async refreshSubscription() {
    if (!browser || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      this.subscribed = Boolean(await reg.pushManager?.getSubscription());
    } catch {
      this.subscribed = false;
    }
  }

  async promptInstall(): Promise<void> {
    if (!this.deferred) return;
    await this.deferred.prompt();
    const { outcome } = await this.deferred.userChoice;
    this.deferred = null;
    if (outcome === 'accepted') this.platform = 'installed';
  }

  /**
   * Ask for notification permission.
   *
   * Only ever call this from a real tap. A permission prompt fired on page
   * load is the fastest way to a permanent denial, and a denial cannot be
   * undone from the page.
   */
  async enableNotifications(vapidKey?: string): Promise<void> {
    if (!browser || !('Notification' in window)) {
      this.message = 'This browser does not support notifications.';
      return;
    }
    if (this.platform === 'ios-safari') {
      this.message = 'On iPhone, add Zuban to your Home Screen first — iOS only allows notifications for installed web apps.';
      return;
    }

    const permission = await Notification.requestPermission();
    this.pushPermission = permission;
    if (permission !== 'granted') {
      this.message = 'Notifications are blocked. You can re-enable them in your browser settings.';
      return;
    }

    if (!vapidKey) {
      // Local reminders still work without a push server; they just cannot
      // fire while the app is closed.
      this.message = 'Reminders enabled on this device.';
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      this.subscribed = true;
      this.message = 'Reminders on.';
    } catch (err) {
      this.message = err instanceof Error ? err.message : 'Could not enable reminders.';
    }
  }

  /** Fire a local reminder now — used to show the learner what they'll get. */
  async testNotification(dueCount: number): Promise<void> {
    if (this.pushPermission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    // Phrased as information, not obligation. "Six cards are slipping" is
    // true and actionable; "don't break your streak" is neither.
    await reg.showNotification('Zuban', {
      body: dueCount > 0
        ? `${dueCount} ${dueCount === 1 ? 'card is' : 'cards are'} ready for review.`
        : 'Nothing due right now — nice work.',
      icon: `${base}/icon-192.png`,
      badge: `${base}/icon-192.png`,
      tag: 'zuban-due'
    });
  }
}

/**
 * VAPID keys are base64url; PushManager wants raw bytes.
 *
 * Backed by an explicit ArrayBuffer rather than Uint8Array.from, because
 * PushManager's type requires a definitely-not-shared buffer.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const install = new Install();

/**
 * Account state.
 *
 * Signing in is entirely optional and exists for one reason: so progress
 * survives a lost or replaced phone. The app must stay fully usable
 * without it, so every path here degrades to "local only" rather than
 * blocking the learner.
 *
 * Email magic links rather than passwords — the audience is largely on
 * phones, and a password is friction plus a support burden for a benefit
 * nobody wants from a language app.
 */

import { browser } from '$app/environment';
import { supabase, isConfigured, sync, saveSubscription, deleteSubscription } from './sync';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

// The endpoint we last persisted, so a browser-initiated subscription
// rotation is noticed and re-saved on the next app open without
// re-upserting on every load.
const ENDPOINT_KEY = 'zuban:push-endpoint';

export type AuthState = 'unconfigured' | 'signed-out' | 'sent' | 'signed-in' | 'error';

class Auth {
  state = $state<AuthState>(isConfigured() ? 'signed-out' : 'unconfigured');
  user = $state<User | null>(null);
  message = $state<string | null>(null);
  syncing = $state(false);
  lastSync = $state<string | null>(null);
  private initialized = false;

  // Idempotent: the layout calls this on every app open, and pages may call
  // it too. A second call must not stack another onAuthStateChange listener.
  async init() {
    if (this.initialized) return;
    this.initialized = true;
    const sb = supabase();
    if (!sb) {
      this.state = 'unconfigured';
      return;
    }
    const { data } = await sb.auth.getSession();
    this.apply('INITIAL_SESSION', data.session);
    sb.auth.onAuthStateChange((evt, session) => this.apply(evt, session));
  }

  private apply(evt: AuthChangeEvent, session: Session | null) {
    this.user = session?.user ?? null;
    this.state = this.user ? 'signed-in' : 'signed-out';
    if (!this.user) return;
    // A learner may have turned on reminders before signing in; the
    // subscription existed only in the browser then. Persist it on a real
    // sign-in, and on later loads only if the browser has rotated the
    // endpoint underneath us — not on every page open.
    if (evt === 'SIGNED_IN') void this.persistPushSubscription(true);
    else if (evt === 'INITIAL_SESSION') void this.persistPushSubscription(false);
  }

  private async persistPushSubscription(force: boolean) {
    if (!browser || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager?.getSubscription();
      if (!sub) return;
      if (!force && localStorage.getItem(ENDPOINT_KEY) === sub.endpoint) return;
      if (await saveSubscription(sub.toJSON())) {
        localStorage.setItem(ENDPOINT_KEY, sub.endpoint);
      }
    } catch {
      // Reminders are best-effort; never let them disturb sign-in.
    }
  }

  async signIn(email: string) {
    const sb = supabase();
    if (!sb) return;
    this.message = null;
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      this.state = 'error';
      this.message = error.message;
      return;
    }
    this.state = 'sent';
    this.message = `Check ${email} for a sign-in link.`;
  }

  async signOut() {
    // The push subscription row must go first, while RLS still lets this
    // account delete its own rows. Without this, a shared device keeps
    // receiving the previous account's due-review pushes forever.
    if (browser && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager?.getSubscription();
        if (sub) await deleteSubscription(sub.endpoint);
        localStorage.removeItem(ENDPOINT_KEY);
      } catch {
        // Best-effort; sign-out must not be blockable by push state.
      }
    }
    // Local progress is deliberately left in place. Signing out should not
    // wipe a learner's work — they may simply be handing over the phone.
    await supabase()?.auth.signOut();
    this.state = 'signed-out';
    this.user = null;
  }

  /** Push local progress up and pull anything newer down. Never throws. */
  async runSync(course: string): Promise<void> {
    if (this.state !== 'signed-in' || this.syncing) return;
    this.syncing = true;
    try {
      const result = await sync(course);
      if (result) this.lastSync = new Date().toISOString();
    } catch (err) {
      // Sync failing is not a reason to interrupt a lesson.
      this.message = err instanceof Error ? err.message : 'Sync failed';
    } finally {
      this.syncing = false;
    }
  }
}

export const auth = new Auth();

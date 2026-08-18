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

import { supabase, isConfigured, sync } from './sync';
import type { Session, User } from '@supabase/supabase-js';

export type AuthState = 'unconfigured' | 'signed-out' | 'sent' | 'signed-in' | 'error';

class Auth {
  state = $state<AuthState>(isConfigured() ? 'signed-out' : 'unconfigured');
  user = $state<User | null>(null);
  message = $state<string | null>(null);
  syncing = $state(false);
  lastSync = $state<string | null>(null);

  async init() {
    const sb = supabase();
    if (!sb) {
      this.state = 'unconfigured';
      return;
    }
    const { data } = await sb.auth.getSession();
    this.apply(data.session);
    sb.auth.onAuthStateChange((_evt, session) => this.apply(session));
  }

  private apply(session: Session | null) {
    this.user = session?.user ?? null;
    this.state = this.user ? 'signed-in' : 'signed-out';
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

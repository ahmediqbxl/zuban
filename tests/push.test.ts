import { describe, it, expect } from 'vitest';
import { toSubscriptionRow } from '../src/lib/db/sync';

const UID = '00000000-0000-0000-0000-000000000001';

const full = {
  endpoint: 'https://push.example.com/send/abc',
  expirationTime: null,
  keys: { p256dh: 'BPub', auth: 'AuTh' }
} satisfies PushSubscriptionJSON;

describe('toSubscriptionRow', () => {
  it('shapes a complete subscription into a row', () => {
    expect(toSubscriptionRow(UID, full)).toEqual({
      user_id: UID,
      endpoint: full.endpoint,
      keys: { p256dh: 'BPub', auth: 'AuTh' }
    });
  });

  it('drops browser-only fields like expirationTime', () => {
    const row = toSubscriptionRow(UID, full)!;
    expect('expirationTime' in row).toBe(false);
    expect(Object.keys(row.keys).sort()).toEqual(['auth', 'p256dh']);
  });

  // A row missing any Web Push ingredient can never be delivered to, so
  // it must be rejected rather than stored as junk the sender trips on.
  it('rejects a subscription with no endpoint', () => {
    expect(toSubscriptionRow(UID, { ...full, endpoint: undefined })).toBeNull();
  });

  it('rejects a subscription missing either encryption key', () => {
    expect(toSubscriptionRow(UID, { ...full, keys: { p256dh: 'BPub' } })).toBeNull();
    expect(toSubscriptionRow(UID, { ...full, keys: { auth: 'AuTh' } })).toBeNull();
    expect(toSubscriptionRow(UID, { ...full, keys: undefined })).toBeNull();
  });
});

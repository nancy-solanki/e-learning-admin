import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ API_ROOT: '' }));
vi.mock('../../src/api/config', () => config);
import { avatarUrl } from '../../src/lib/avatar';

describe('avatarUrl', () => {
  beforeEach(() => {
    config.API_ROOT = '';
    vi.stubGlobal('window', {
      location: { origin: 'https://admin.example.com' },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([undefined, null, '', { id: '1', name: 'empty', url: '' }])(
    'returns no URL for an empty avatar: %j',
    (avatar) => expect(avatarUrl(avatar)).toBeUndefined(),
  );
  it('preserves an absolute image URL', () => {
    expect(avatarUrl('https://cdn.example.com/photo.png')).toBe(
      'https://cdn.example.com/photo.png',
    );
  });
  it('reads an uploaded avatar object', () => {
    expect(avatarUrl({ id: '1', name: 'photo', url: '/media/photo.png' })).toBe(
      'https://admin.example.com/media/photo.png',
    );
  });
  it('resolves a relative path against the app origin when no API root is configured', () => {
    expect(avatarUrl('media/photo.png')).toBe(
      'https://admin.example.com/media/photo.png',
    );
  });
  it('resolves a media path against a separate API origin', () => {
    config.API_ROOT = 'https://api.example.com';
    expect(avatarUrl('/media/photo.png')).toBe(
      'https://api.example.com/media/photo.png',
    );
  });
  it('supports a relative API root', () => {
    config.API_ROOT = '/backend/';
    expect(avatarUrl('media/photo.png')).toBe(
      'https://admin.example.com/backend/media/photo.png',
    );
  });
  it('returns no URL for malformed input', () => {
    expect(avatarUrl('http://[')).toBeUndefined();
  });
});

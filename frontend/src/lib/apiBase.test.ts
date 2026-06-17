import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveMediaUrl } from './apiBase';

describe('resolveMediaUrl', () => {
  const prev = import.meta.env.VITE_API_URL;

  beforeEach(() => {
    import.meta.env.VITE_API_URL = '';
  });

  afterEach(() => {
    import.meta.env.VITE_API_URL = prev;
  });

  it('returns undefined for empty path', () => {
    expect(resolveMediaUrl(null)).toBeUndefined();
    expect(resolveMediaUrl('')).toBeUndefined();
  });

  it('keeps absolute URLs unchanged', () => {
    expect(resolveMediaUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });

  it('uses relative path in dev (no VITE_API_URL)', () => {
    expect(resolveMediaUrl('/uploads/avatar.png')).toBe('/uploads/avatar.png');
  });

  it('prefixes api origin when VITE_API_URL is set', () => {
    import.meta.env.VITE_API_URL = 'https://api.example.com';
    expect(resolveMediaUrl('/uploads/avatar.png')).toBe('https://api.example.com/uploads/avatar.png');
  });
});

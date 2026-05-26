import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyTranslateTarget,
  getTranslateTarget,
  setTranslateTarget,
} from './translateTarget';

describe('translateTarget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to ja when storage empty', () => {
    expect(getTranslateTarget('user-a')).toBe('ja');
  });

  it('persists per user', () => {
    setTranslateTarget('user-a', 'vi');
    setTranslateTarget('user-b', 'ja');
    expect(getTranslateTarget('user-a')).toBe('vi');
    expect(getTranslateTarget('user-b')).toBe('ja');
  });

  it('applyTranslateTarget syncs from server value', () => {
    expect(applyTranslateTarget('user-a', 'vi')).toBe('vi');
    expect(getTranslateTarget('user-a')).toBe('vi');
  });

  it('ignores invalid stored value', () => {
    localStorage.setItem('vjsync_translateTo_user-a', 'xx');
    expect(getTranslateTarget('user-a')).toBe('ja');
  });
});

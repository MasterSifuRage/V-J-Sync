import { describe, it, expect, beforeEach } from 'vitest';
import { getTranslateTarget, setTranslateTarget } from './translateTarget';

describe('translateTarget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to ja when storage empty', () => {
    expect(getTranslateTarget()).toBe('ja');
  });

  it('persists vi', () => {
    setTranslateTarget('vi');
    expect(getTranslateTarget()).toBe('vi');
  });

  it('ignores invalid stored value', () => {
    localStorage.setItem('vjsync_translateTo', 'xx');
    expect(getTranslateTarget()).toBe('ja');
  });
});

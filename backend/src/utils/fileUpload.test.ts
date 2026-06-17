import { describe, it, expect } from 'vitest';
import { decodeUploadedFileName } from './fileUpload';

describe('decodeUploadedFileName', () => {
  it('decodes utf-8 filename from latin1', () => {
    const garbled = Buffer.from('Báo cáo.pdf', 'utf8').toString('latin1');
    expect(decodeUploadedFileName(garbled)).toBe('Báo cáo.pdf');
  });

  it('keeps plain ascii names', () => {
    expect(decodeUploadedFileName('report.pdf')).toBe('report.pdf');
  });
});

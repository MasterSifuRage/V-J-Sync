import { describe, it, expect } from 'vitest';
import { applyBulletList, wrapSelection } from './markdownToolbar';
import { renderMarkdownHtml } from './markdown';

describe('markdownToolbar', () => {
  it('wraps selection with bold markers', () => {
    const result = wrapSelection({ value: 'hello world', start: 6, end: 11 }, '**', '**', 'text');
    expect(result.value).toBe('hello **world**');
    expect(result.cursor).toBe(15);
  });

  it('creates bullet list lines', () => {
    const result = applyBulletList({ value: 'a\nb', start: 0, end: 3 }, 'item');
    expect(result.value).toBe('- a\n- b');
  });
});

describe('renderMarkdownHtml', () => {
  it('renders bold and italic', () => {
    const html = renderMarkdownHtml('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders plain paragraphs', () => {
    const html = renderMarkdownHtml('line one\n\nline two');
    expect(html).toContain('line one');
    expect(html).toContain('line two');
  });
});

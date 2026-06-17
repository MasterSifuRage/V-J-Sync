import { describe, it, expect } from 'vitest';
import { editorHtmlToMarkdown, markdownToEditorHtml } from './richTextMarkdown';
import { renderMarkdownHtml } from './markdown';

describe('richTextMarkdown', () => {
  it('converts bold html to markdown', () => {
    const md = editorHtmlToMarkdown('<p><strong>hello</strong></p>');
    expect(md).toContain('**hello**');
  });

  it('round-trips bold through editor html', () => {
    const html = markdownToEditorHtml('**bold** text');
    expect(html).toContain('<strong>bold</strong>');
    const md = editorHtmlToMarkdown(html);
    expect(md).toContain('**bold**');
  });

  it('returns empty for blank editor', () => {
    expect(editorHtmlToMarkdown('<div><br></div>')).toBe('');
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

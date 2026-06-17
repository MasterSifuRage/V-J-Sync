import TurndownService from 'turndown';
import { renderMarkdownHtml } from './markdown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

turndown.addRule('alignedBlock', {
  filter(node: HTMLElement) {
    return Boolean(node.getAttribute('align')) && !node.classList.contains('markdown-editor-body');
  },
  replacement(content: string, node: HTMLElement) {
    const align = node.getAttribute('align') || 'left';
    const trimmed = content.trim();
    if (!trimmed) return '';
    return `\n<div align="${align}">\n\n${trimmed}\n\n</div>\n`;
  },
});

const EMPTY_EDITOR_HTML = new Set(['', '<br>', '<div><br></div>', '<p><br></p>', '<p></p>']);

function editorPlainText(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, '').replace(/\u00a0/g, ' ').trim();
  }
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
}

export function markdownToEditorHtml(markdown: string): string {
  if (!markdown.trim()) return '';
  return renderMarkdownHtml(markdown);
}

export function editorHtmlToMarkdown(html: string): string {
  const cleaned = html.trim();
  if (EMPTY_EDITOR_HTML.has(cleaned)) return '';
  if (!editorPlainText(cleaned)) return '';
  return turndown.turndown(cleaned).replace(/\n{3,}/g, '\n\n').trim();
}

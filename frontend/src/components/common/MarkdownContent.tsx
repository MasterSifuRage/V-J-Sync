import { useMemo } from 'react';
import { renderMarkdownHtml } from '../../lib/markdown';
import './MarkdownContent.css';

type MarkdownContentProps = {
  markdown: string;
  className?: string;
};

export default function MarkdownContent({ markdown, className = '' }: MarkdownContentProps) {
  const html = useMemo(() => renderMarkdownHtml(markdown), [markdown]);
  if (!html) return null;

  return (
    <div
      className={`markdown-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

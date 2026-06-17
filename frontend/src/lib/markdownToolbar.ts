export type TextSelection = {
  value: string;
  start: number;
  end: number;
};

export function getTextSelection(value: string, textarea: HTMLTextAreaElement): TextSelection {
  return {
    value,
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  };
}

export function applyTextEdit(
  textarea: HTMLTextAreaElement,
  nextValue: string,
  cursor: number,
  onChange: (value: string) => void,
) {
  onChange(nextValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  });
}

export function wrapSelection(
  { value, start, end }: TextSelection,
  before: string,
  after: string,
  placeholder = 'text',
): { value: string; cursor: number } {
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { value: next, cursor };
}

export function applyBulletList({ value, start, end }: TextSelection, placeholder = 'mục'): {
  value: string;
  cursor: number;
} {
  const block = value.slice(start, end) || placeholder;
  const formatted = block
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '- ';
      return trimmed.startsWith('- ') ? trimmed : `- ${trimmed}`;
    })
    .join('\n');
  const next = value.slice(0, start) + formatted + value.slice(end);
  return { value: next, cursor: start + formatted.length };
}

export function applyAlignBlock(
  { value, start, end }: TextSelection,
  align: 'left' | 'center' | 'right',
  placeholder = 'nội dung',
): { value: string; cursor: number } {
  const selected = value.slice(start, end) || placeholder;
  const formatted = `<div align="${align}">\n\n${selected}\n\n</div>`;
  const next = value.slice(0, start) + formatted + value.slice(end);
  return { value: next, cursor: start + formatted.length };
}

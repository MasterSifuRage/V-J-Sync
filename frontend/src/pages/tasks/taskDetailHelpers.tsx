import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function TaskTranslationBlock({
  children,
  variant = 'ja',
}: {
  children: ReactNode;
  variant?: 'ja' | 'vi';
}) {
  const { t } = useTranslation();
  if (!children) return null;
  const labelKey = variant === 'ja' ? 'tasks.autoTranslationJa' : 'tasks.autoTranslationVi';
  return (
    <div className="task-translation-block">
      <div className="task-translation-label">
        <i className="fas fa-language" /> {t(labelKey)}
      </div>
      <div className="task-translation-content">{children}</div>
    </div>
  );
}

export function taskShortId(id: string): string {
  return `TASK-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export async function fetchTranslation(
  text: string,
  from: 'vi' | 'ja',
  to: 'vi' | 'ja',
  translateFn: (payload: { text: string; from: string; to: string }) => Promise<{ data: Record<string, string> }>
): Promise<string | null> {
  if (!text.trim() || from === to) return null;
  try {
    const res = await translateFn({ text, from, to });
    return res.data.translated ?? res.data.translation ?? res.data.text ?? null;
  } catch {
    return null;
  }
}

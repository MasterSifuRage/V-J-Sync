import { useEffect, useState } from 'react';
import { aiAPI } from '../services/api';
import { detectTextLang, isValidTranslation, translationPair } from '../lib/textLang';
import { fetchTranslation } from '../pages/tasks/taskDetailHelpers';
import { useTranslateTarget } from './useTranslateTarget';

/** Tự dịch mô tả theo Settings → Ngôn ngữ dịch sang (không tóm tắt). */
export function useDescriptionTranslation(
  description: string | null | undefined,
  storedTargetLang?: string | null,
) {
  const translateTarget = useTranslateTarget();
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sourceLang = description?.trim() ? detectTextLang(description) : null;
  const needsTranslation = !!sourceLang && !!translationPair(sourceLang, translateTarget);

  useEffect(() => {
    if (!description?.trim() || !needsTranslation) {
      setTranslation(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const pair = translationPair(sourceLang!, translateTarget)!;

    const load = async () => {
      setLoading(true);
      try {
        if (
          storedTargetLang?.trim() &&
          isValidTranslation(storedTargetLang, translateTarget)
        ) {
          if (!cancelled) setTranslation(storedTargetLang.trim());
          return;
        }
        const out = await fetchTranslation(description, pair.from, pair.to, aiAPI.translate);
        if (!cancelled) setTranslation(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [description, translateTarget, needsTranslation, sourceLang, storedTargetLang]);

  return { translation, loading, translateTarget, needsTranslation };
}

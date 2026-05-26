import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  getTranslateTarget,
  TRANSLATE_TARGET_CHANGED,
  type TranslateTargetLang,
} from '../lib/translateTarget';

export function useTranslateTarget(): TranslateTargetLang {
  const userId = useAuthStore((s) => s.user?.id);
  const [target, setTarget] = useState<TranslateTargetLang>(() => getTranslateTarget(userId));

  useEffect(() => {
    setTarget(getTranslateTarget(userId));
  }, [userId]);

  useEffect(() => {
    const sync = (e: Event) => {
      const detail = (e as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      setTarget(getTranslateTarget(userId));
    };
    window.addEventListener(TRANSLATE_TARGET_CHANGED, sync);
    return () => window.removeEventListener(TRANSLATE_TARGET_CHANGED, sync);
  }, [userId]);

  return target;
}

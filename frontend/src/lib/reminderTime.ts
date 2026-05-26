import type { TFunction } from 'i18next';

export type CountdownVariant = 'done' | 'overdue' | 'soon' | 'upcoming';

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatReminderClock(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatReminderDateLabel(iso: string, locale: string, t: TFunction): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) return t('reminders.todayLabel');
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, tomorrow)) return t('reminders.tomorrowLabel');
  return d
    .toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' })
    .toUpperCase();
}

export function formatReminderSchedule(iso: string, locale: string, t: TFunction): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameDay(d, now)) return t('reminders.onceToday');
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getTimezoneLabel(uiLang: string, t: TFunction): string {
  return uiLang.startsWith('ja') ? t('reminders.tzJapan') : t('reminders.tzVietnam');
}

export function getCountdown(
  remindAt: string,
  isCompleted: boolean,
  t: TFunction,
): { text: string; variant: CountdownVariant } {
  if (isCompleted) {
    return { text: t('reminders.countdownDone'), variant: 'done' };
  }

  const diffMs = new Date(remindAt).getTime() - Date.now();
  if (diffMs <= 0) {
    const overdue = Math.abs(diffMs);
    const days = Math.floor(overdue / 86400000);
    const hours = Math.floor((overdue % 86400000) / 3600000);
    if (days > 0) return { text: t('reminders.countdownOverdueDays', { days }), variant: 'overdue' };
    if (hours > 0) return { text: t('reminders.countdownOverdueHours', { hours }), variant: 'overdue' };
    return { text: t('reminders.countdownOverdueNow'), variant: 'overdue' };
  }

  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  if (days > 0) {
    return {
      text: t('reminders.countdownDaysHours', { days, hours }),
      variant: days <= 1 ? 'soon' : 'upcoming',
    };
  }
  if (hours > 0) {
    return {
      text: t('reminders.countdownHoursMinutes', { hours, minutes }),
      variant: hours <= 2 ? 'soon' : 'upcoming',
    };
  }
  return {
    text: t('reminders.countdownMinutes', { minutes: Math.max(minutes, 1) }),
    variant: 'soon',
  };
}

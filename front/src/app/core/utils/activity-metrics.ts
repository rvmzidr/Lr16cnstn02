export function isSameCalendarMonth(value: string | null | undefined, now = new Date()) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function isWithinDays(value: string | null | undefined, days: number, now = new Date()) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - (days - 1));

  return date >= windowStart && date <= now;
}

export function countWithinDays<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  days: number,
  now = new Date()
) {
  return items.filter((item) => isWithinDays(getDate(item), days, now)).length;
}

export function countThisMonth<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  now = new Date()
) {
  return items.filter((item) => isSameCalendarMonth(getDate(item), now)).length;
}

export function countDistinct<T>(items: T[], getValue: (item: T) => string | number | null | undefined) {
  const values = new Set<string | number>();

  items.forEach((item) => {
    const value = getValue(item);
    if (value !== null && value !== undefined && value !== "") {
      values.add(value);
    }
  });

  return values.size;
}

export function toPercent(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function countTruthy(values: Array<boolean | null | undefined>) {
  return values.filter(Boolean).length;
}

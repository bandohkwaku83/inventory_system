import dayjs, { type Dayjs } from 'dayjs';

export interface MonthWeek {
  key: string;
  label: string;
  start: Dayjs;
  end: Dayjs;
}

/** Split a calendar month into consecutive 7-day blocks (last block may be shorter). */
export function getWeeksInMonth(month: Dayjs): MonthWeek[] {
  const monthStart = month.startOf('month');
  const monthEnd = month.endOf('month');
  const weeks: MonthWeek[] = [];
  let cursor = monthStart;
  let weekNum = 1;

  while (cursor.isBefore(monthEnd) || cursor.isSame(monthEnd, 'day')) {
    const end = cursor.add(6, 'day');
    const weekEnd = end.isAfter(monthEnd) ? monthEnd : end;
    weeks.push({
      key: `w${weekNum}`,
      label: `Week ${weekNum} (${cursor.format('MMM D')} – ${weekEnd.format('MMM D')})`,
      start: cursor,
      end: weekEnd,
    });
    cursor = weekEnd.add(1, 'day');
    weekNum += 1;
  }

  return weeks;
}

export function datesInRange(start: Dayjs, end: Dayjs): Dayjs[] {
  const dates: Dayjs[] = [];
  let cursor = start;
  while (cursor.isBefore(end, 'day') || cursor.isSame(end, 'day')) {
    dates.push(cursor);
    cursor = cursor.add(1, 'day');
  }
  return dates;
}

export function weekIndexForDate(month: Dayjs, date: Dayjs = dayjs()): number {
  const weeks = getWeeksInMonth(month);
  const idx = weeks.findIndex(
    (w) =>
      (date.isAfter(w.start, 'day') || date.isSame(w.start, 'day')) &&
      (date.isBefore(w.end, 'day') || date.isSame(w.end, 'day'))
  );
  return idx >= 0 ? idx : 0;
}

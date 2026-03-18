type DateInput = string | Date;

function toDate(input: DateInput) {
  if (input instanceof Date) {
    return input;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  return new Date(input);
}

export function formatCompactEventDate(input: DateInput) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(toDate(input));
}

export function formatFullEventDate(input: DateInput) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(toDate(input));
}

export function formatMonthLabel(input: DateInput) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(toDate(input));
}

export function formatTimeRange(start?: string, end?: string) {
  if (!start && !end) {
    return "";
  }

  if (!start) {
    return end!;
  }

  if (!end) {
    return start;
  }

  return `${start} - ${end}`;
}

export function groupEventsByMonth<T extends { cover: { date: string } }>(
  events: T[]
) {
  return events.reduce<Record<string, T[]>>((groups, event) => {
    const label = formatMonthLabel(event.cover.date);

    if (!groups[label]) {
      groups[label] = [];
    }

    groups[label].push(event);
    return groups;
  }, {});
}

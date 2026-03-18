import { cn } from "@/lib/utils/index";

type CalendarEventTone = "accent" | "muted" | "success";

type CalendarEvent = {
  id: string;
  title: string;
  subtitle?: string;
  tone?: CalendarEventTone;
};

type CalendarDay = {
  key: string;
  dayNumber?: number;
  isCurrentMonth?: boolean;
  events?: CalendarEvent[];
};

type MonthlyCalendarProps = {
  monthLabel: string;
  yearLabel: string;
  weekdayLabels: string[];
  days: CalendarDay[];
  onMonthClick?: () => void;
  onYearClick?: () => void;
  className?: string;
};

const toneClasses: Record<CalendarEventTone, string> = {
  accent:
    "border-[rgba(172,27,42,0.3)] bg-[linear-gradient(180deg,rgba(172,27,42,0.22),rgba(172,27,42,0.08))]",
  muted: "border-white/10 bg-white/6",
  success: "border-[hsla(142,70%,45%,0.35)] bg-[hsla(142,70%,45%,0.12)]",
};

function CalendarControl({
  label,
  onClick,
  align = "left",
}: {
  label: string;
  onClick?: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-w-[8.5rem] items-center justify-between rounded-[var(--radius-surface)] border border-border bg-panel-2 px-3 py-1 text-body text-fg transition hover:bg-white/6",
        align === "right" && "ml-auto",
      )}
    >
      <span>{label}</span>
      <span className="text-muted" aria-hidden="true">
        {align === "left" ? "v" : "v"}
      </span>
    </button>
  );
}

export function MonthlyCalendar({
  monthLabel,
  yearLabel,
  weekdayLabels,
  days,
  onMonthClick,
  onYearClick,
  className,
}: MonthlyCalendarProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-surface)] border border-border bg-panel",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <CalendarControl label={monthLabel} onClick={onMonthClick} />
        <CalendarControl
          label={yearLabel}
          onClick={onYearClick}
          align="right"
        />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[48rem]">
          <div className="grid grid-cols-7 border-b border-border bg-panel-2">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="border-r border-border px-3 py-2 text-body-sm uppercase tracking-widerish text-muted last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => (
              <div
                key={day.key}
                className={cn(
                  "min-h-[10.5rem] border-r border-b border-border p-2",
                  (index + 1) % 7 === 0 && "border-r-0",
                  !day.isCurrentMonth && "bg-black/10",
                )}
              >
                <div
                  className={cn(
                    "mb-2 text-body-sm tracking-tightish",
                    day.isCurrentMonth === false ? "text-muted/60" : "text-fg",
                  )}
                >
                  {day.dayNumber ?? ""}
                </div>

                <div className="space-y-2">
                  {day.events?.map((event) => (
                    <article
                      key={event.id}
                      className={cn(
                        "rounded-[var(--radius-surface)] border p-2",
                        toneClasses[event.tone ?? "muted"],
                      )}
                    >
                      <div className="aspect-[16/9] rounded-[4px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
                      <div className="mt-2 text-body-sm text-fg">
                        {event.title}
                      </div>
                      {event.subtitle ? (
                        <div className="mt-1 text-body-sm text-muted">
                          {event.subtitle}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

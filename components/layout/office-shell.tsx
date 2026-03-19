import { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/index";

type OfficeShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  tabs?: ReactNode;
  headerActions?: ReactNode;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  descriptionClassName?: string;
  descriptionStyle?: CSSProperties;
};

export function OfficeShell({
  children,
  eyebrow = "Recruiter Office",
  title,
  description,
  tabs,
  headerActions,
  titleClassName,
  titleStyle,
  descriptionClassName,
  descriptionStyle,
}: OfficeShellProps) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-panel px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/office"
              className="text-title uppercase tracking-[0.2em] transition hover:opacity-90"
              style={{ color: "var(--accent-hex)" }}
            >
              OFFICE
            </Link>
            <div className="min-w-0 text-body text-[#FFFFFF]">
              Nightlife Ops System
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:flex-nowrap">
            <div className="min-w-0 flex-1 md:w-[14rem]">
              <Input placeholder="Search office" className="w-full" />
            </div>
            <nav
              aria-label="Office quick links"
              className="flex items-center gap-4 text-body text-muted"
            >
              <Link href="/office" className="transition hover:text-fg">
                Office
              </Link>
              <Link
                href="/office/events/new"
                className="transition hover:text-fg"
              >
                New Event
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 md:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                {eyebrow ? (
                  <p className="text-body-sm uppercase tracking-widerish text-muted">
                    {eyebrow}
                  </p>
                ) : null}
                <div className="space-y-1">
                  <h1
                    className={cn(
                      "text-title font-semibold tracking-tightish",
                      titleClassName,
                    )}
                    style={titleStyle}
                  >
                    {title}
                  </h1>
                  {description ? (
                    <p
                      className={cn(
                        "max-w-3xl text-body text-muted",
                        descriptionClassName,
                      )}
                      style={descriptionStyle}
                    >
                      {description}
                    </p>
                  ) : null}
                </div>
              </div>

              {headerActions ? (
                <div className="flex flex-wrap items-center gap-3">
                  {headerActions}
                </div>
              ) : null}
            </div>

            {tabs ? <div>{tabs}</div> : null}
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}

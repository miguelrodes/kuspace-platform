import { CSSProperties, ReactNode } from "react";
import { RecruiterTopNav } from "@/components/layout/recruiter-top-nav";
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
      <RecruiterTopNav />

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

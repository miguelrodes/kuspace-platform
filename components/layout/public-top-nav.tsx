import Link from "next/link";
import { Input } from "@/components/ui/input";

type PublicTopNavProps = {
  title?: string;
  subtitle?: string;
};

export function PublicTopNav({
  title = "Nightlife Office",
  subtitle = "Public Event Network",
}: PublicTopNavProps) {
  return (
    <header className="border-b border-border bg-panel px-3 py-3 md:px-5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 md:items-end">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="text-title uppercase tracking-[0.2em] transition hover:opacity-90"
            style={{ color: "var(--accent-hex)" }}
          >
            OFFICE
          </Link>
          <div className="min-w-0">
            <div className="truncate text-body text-fg">{title}</div>
            <div className="truncate text-body-sm uppercase tracking-widerish text-muted">
              {subtitle}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 pt-2 md:w-auto md:flex-nowrap md:gap-5 md:pt-5">
          <nav
            aria-label="Public navigation"
            className="ml-3 flex items-center gap-5 text-body-lg text-muted md:ml-4"
          >
            <Link
              href="/"
              className="transition hover:text-fg"
              style={{ color: "hsl(var(--text))" }}
            >
              Home
            </Link>
            <Link href="/login" className="transition hover:text-fg">
              Login
            </Link>
          </nav>
          <div className="min-w-0 flex-1 md:w-[16rem]">
            <Input
              placeholder="Search events, artists, venues..."
              className="!h-7 w-full px-2.5 text-body-sm"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopNav() {
  return (
    <header className="border-b border-border bg-panel px-4 py-3 md:px-6 md:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 md:h-[62px] md:flex-nowrap">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Go to home">
            <img src="/favicon.ico" alt="" className="h-10 w-10 shrink-0" aria-hidden="true" />
          </Link>
          <Link href="/" aria-label="Go to home" className="ml-1 shrink-0">
            <img
              src="/title-logo.svg"
              alt="KUSPACE"
              className="block h-10 w-auto translate-y-[3px]"
            />
          </Link>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:flex-nowrap">
          <Input placeholder="Search" className="w-full min-w-0 md:w-[14rem]" />
          <Button variant="subtle">Profile</Button>
          <Button variant="ghost" className="text-[var(--accent-hex)]">
            New Event
          </Button>
        </div>
      </div>
    </header>
  );
}

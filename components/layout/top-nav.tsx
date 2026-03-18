import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopNav() {
  return (
    <header className="border-b border-border bg-panel px-4 py-3 md:px-6 md:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 md:h-[62px] md:flex-nowrap">
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-title uppercase tracking-[0.2em] text-accent">
            OFFICE
          </div>
          <div className="min-w-0 text-subheading text-muted">
            Nightlife Ops System
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:flex-nowrap">
          <Input placeholder="Search" className="w-full min-w-0 md:w-[14rem]" />
          <Button variant="subtle">Profile</Button>
          <Button>New Event</Button>
        </div>
      </div>
    </header>
  );
}

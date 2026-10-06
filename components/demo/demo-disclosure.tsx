import Link from "next/link";

export function DemoDisclosure() {
  return (
    <aside
      aria-label="Demo information"
      className="border-b border-border bg-panel-2 px-4 py-2 text-center text-xs leading-5 text-muted"
    >
      <Link href="/demo-info" className="hover:text-fg hover:underline">
        Portfolio demo — historical event listings; fictional operational data. No real tickets, payments or bookings.
      </Link>
    </aside>
  );
}

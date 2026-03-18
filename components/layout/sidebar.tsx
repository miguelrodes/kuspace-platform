import Link from "next/link";

const items = [
  { href: "/", label: "Office" },
  { href: "/events", label: "Events" },
  { href: "/tickets", label: "Tickets" },
  { href: "/guests", label: "Guestlists" },
  { href: "/settings", label: "Settings" },
  { href: "/playground", label: "Playground" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-panel md:block">
      <div className="border-b border-border px-4 py-4">
        <div className="text-subheading font-semibold tracking-tightish text-fg">
          Back Office
        </div>
        <div className="text-body-sm uppercase tracking-widerish text-muted">
          Recruiter Console
        </div>
      </div>

      <nav className="p-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-[var(--radius-surface)] px-3 py-3 text-body text-muted transition hover:bg-panel-2 hover:text-fg"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

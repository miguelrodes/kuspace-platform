import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-5 text-center text-xs text-muted md:px-6">
      <nav aria-label="Site information" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link className="hover:text-fg" href="/demo-info">Demo information &amp; credits</Link>
        <Link className="hover:text-fg" href="/privacy">Privacy</Link>
        <Link className="hover:text-fg" href="/cookies">Cookies &amp; storage</Link>
        <a className="hover:text-fg" href="mailto:miguelrodes24@gmail.com">Contact</a>
      </nav>
    </footer>
  );
}

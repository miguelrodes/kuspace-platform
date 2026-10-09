import { LegalPage, LegalSection } from "@/components/demo/legal-page";

const storage = [
  {
    name: "kuspace_demo_sandbox",
    provider: "KUSPACE / site domain",
    purpose: "Routes one-click demo visitors to an isolated UI and blocks database APIs; not an authenticated identity",
    lifetime: "Browser session; HttpOnly, SameSite=Lax, Secure on HTTPS",
    category: "Requested demo functionality",
  },
  {
    name: "kuspace_demo_session_v1 (sessionStorage)",
    provider: "KUSPACE / current browser tab",
    purpose: "Stores your demo role, workspace and local edits without sending those edits to the database",
    lifetime: "Current tab session; Reset demo replaces the data and choosing another role starts fresh",
    category: "Requested demo functionality",
  },
  {
    name: "__session",
    provider: "Clerk / KUSPACE site domain",
    purpose: "Short-lived signed-in session token used by Clerk and this app",
    lifetime: "Short-lived and refreshed while the session is active; Clerk documents a 60-second token, but this deployment's cookie attributes still need runtime confirmation",
    category: "Necessary authentication",
  },
  {
    name: "__clerk_db_jwt (URL parameter, not a cookie)",
    provider: "Clerk / accounts.dev development instance",
    purpose: "Development-instance browser authentication state, according to Clerk's documentation",
    lifetime: "Linked to Clerk's development session; exact deployed duration not verified",
    category: "Necessary authentication",
  },
  {
    name: "kuspace_current_organization_id",
    provider: "KUSPACE / site domain",
    purpose: "Remembers the selected recruiter workspace; server checks membership before switching",
    lifetime: "Browser session (no Max-Age or Expires set by the app)",
    category: "Necessary workspace selection",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies & browser storage">
      <LegalSection title="What this site uses">
        <p>KUSPACE uses cookies and similar browser storage to support functions such as authentication, session security and your selected demo workspace. The information below describes storage used by this demonstration.</p>
        <p>This inventory is based on the application&apos;s cookie code, the observed Clerk <code>accounts.dev</code> script on the live site and <a className="underline" href="https://clerk.com/docs/guides/development/managing-environments">Clerk&apos;s development-instance documentation</a>. Clerk documents <code>__clerk_db_jwt</code> as a URL parameter, not a cookie, in development instances; the production-only <code>__client</code> cookie is therefore not listed as used here. Cookie names and lifetimes beyond the app-owned cookie still require an authenticated browser-storage check; that check has not been completed. Provider security/handshake cookies may also appear during authentication. A fresh unsigned local request to this page set no cookie.</p>
        <div className="overflow-x-auto rounded-[var(--radius-surface)] border border-border">
          <table className="min-w-[40rem] w-full border-collapse text-left text-sm">
            <thead className="bg-panel-2 text-fg"><tr><th className="p-3">Name</th><th className="p-3">Provider / domain</th><th className="p-3">Purpose</th><th className="p-3">Lifetime</th><th className="p-3">Consent classification</th></tr></thead>
            <tbody>{storage.map((item) => (
              <tr key={item.name} className="border-t border-border align-top">
                <td className="p-3"><code>{item.name}</code></td>
                <td className="p-3">{item.provider}</td>
                <td className="p-3">{item.purpose}</td>
                <td className="p-3">{item.lifetime}</td>
                <td className="p-3">{item.category}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </LegalSection>
      <LegalSection title="Other browser storage and choices">
        <p>The one-click demo uses sessionStorage for edits isolated to your current tab. Reset demo restores the starting dataset. Choosing a role starts a fresh session; closing the tab normally clears its session storage, although browser session restoration may retain it. Clerk&apos;s SDK may use additional browser storage for its separate authentication flow. The app does not implement optional advertising or analytics storage.</p>
        <p>To end access to the shared demo, sign out using the account control. You can also clear this site&apos;s and Clerk&apos;s browser cookies and site storage in your browser settings. Blocking necessary cookies may prevent sign-in or workspace selection.</p>
      </LegalSection>
    </LegalPage>
  );
}

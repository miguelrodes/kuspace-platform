import { LegalPage, LegalSection } from "@/components/demo/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice">
      <LegalSection title="Who operates this demo">
        <p>This KUSPACE demonstration is operated by Miguel Rodés Knuth. For privacy questions or requests, contact <a className="underline" href="mailto:miguelrodes24@gmail.com">miguelrodes24@gmail.com</a>.</p>
      </LegalSection>
      <LegalSection title="The demo data">
        <p>The example guestlists, consumer accounts, orders and operational figures are synthetic. However, operating a website still involves processing some information about actual visitors.</p>
        <p>Historical artist names and professional event information were drawn from public programming. Event-by-event source citations have not yet been catalogued; see the <a className="underline" href="/demo-info">demo information and artwork credits</a> for the current provenance record.</p>
      </LegalSection>
      <LegalSection title="Visiting and signing in">
        <p>When you visit the site, hosting and authentication services may process technical information such as your IP address, browser/device information, request time, requested page, errors, and authentication or session events.</p>
        <p>An email address or other information submitted through a sign-in flow may also be processed by the authentication provider. Use the supplied demo account rather than your personal credentials.</p>
      </LegalSection>
      <LegalSection title="Information you enter">
        <p>In the one-click organiser and clubgoer demos, form edits stay in your browser tab&apos;s session storage and are not saved to the shared database. Reset demo restores the original synthetic data. Separate authenticated management sessions may save changes to the shared database. Use fictional details only; do not enter personal or confidential information.</p>
        <p>If you contact me by email, I receive your email address and the contents of your message to handle your enquiry.</p>
      </LegalSection>
      <LegalSection title="Purposes and proposed lawful basis">
        <p>Information is used to deliver the demonstration, maintain sign-in and workspace selection, protect the application against misuse, investigate technical problems, and respond to enquiries or rights requests.</p>
        <p>Where a lawful basis is required, legitimate interests are proposed for operating the requested demo (limited technical and account data), securing and diagnosing it (security events and error logs), presenting limited historical professional information (public event context), and handling enquiries (replying to and retaining relevant correspondence). These uses should be necessary and proportionate to a small portfolio demo: public browsing is available without sign-in, new account setup is closed, and visitors are asked not to enter real personal details. The operator must review the interests, necessity and impact on visitors before relying on this assessment. A legal obligation may separately apply to particular records or requests. This is not blanket consent to optional tracking.</p>
      </LegalSection>
      <LegalSection title="Providers and external services">
        <p>The application uses Vercel for hosting, Clerk for authentication and session management, and Neon for its PostgreSQL database. Email enquiries are handled through my email provider. These providers may process information to deliver the services and may process their own account, security or service information independently. Their notices do not replace this notice for KUSPACE visitor data.</p>
        <p>For customer data, the providers describe processor arrangements; their own-account and service processing may be as independent controllers. See <a className="underline" href="https://vercel.com/legal/privacy-notice">Vercel privacy notice</a>, <a className="underline" href="https://clerk.com/legal/privacy">Clerk privacy policy</a> and the <a className="underline" href="https://www.databricks.com/legal/privacynotice">current notice linked from Neon</a>.</p>
        <p>Event/profile artwork and the application font are served from this site. Map, artist, social and venue destinations are ordinary outbound links; following one takes you to that third party. Clerk authentication loads its own service resources, and the current public site was observed loading a Clerk <code>accounts.dev</code> development instance. Clerk <a className="underline" href="https://clerk.com/docs/guides/development/managing-environments">documents different session handling</a> for development instances; the operator should review this configuration for public use.</p>
      </LegalSection>
      <LegalSection title="Advertising and optional tracking">
        <p>No app-owned advertising, analytics tag, tracking pixel or session-replay integration was found in the application code for this demo. Hosting and authentication providers may still process technical and security telemetry. Deployment-level integrations and provider-side configuration require separate confirmation before a broader no-tracking claim can be made.</p>
      </LegalSection>
      <LegalSection title="Retention">
        <p>Visitor-editable demo records may remain in the shared demo database while the demonstration operates, until changed, reset or removed by the operator; no automatic deletion interval is implemented. Do not use the demo to store real personal information.</p>
        <p>Authentication and session data are retained according to Clerk session settings and the provider&apos;s security requirements. The actual dashboard-set session duration has not been verified for this notice. The app does not set a separate lifetime for its workspace-selection cookie, so it is a browser-session cookie.</p>
        <p>Application runtime logs may include user IDs, event/action IDs and error messages or stacks; they are retained for troubleshooting and security for the period configured by the host. The current runtime-log retention setting has not been verified. Provider security records and backups follow the relevant provider&apos;s policies and settings, which may outlast the visible application log window; exact periods have not been verified.</p>
        <p>Email correspondence is kept as needed to respond, document a rights or material concern, and meet any applicable legal obligation. No fixed mailbox deletion period has been adopted for this demo.</p>
      </LegalSection>
      <LegalSection title="International processing">
        <p>The demo database connection is configured for Neon&apos;s AWS US East 1 region in the United States. Vercel delivers the site through a distributed hosting network; Clerk authentication and provider support/security processing may take place in other countries. Do not assume EU-only storage.</p>
        <p>Relevant provider terms include the <a className="underline" href="https://vercel.com/legal/dpa">Vercel DPA</a>, <a className="underline" href="https://clerk.com/legal/dpa">Clerk DPA</a> and <a className="underline" href="https://neon.com/pdf/DPA.pdf">Neon DPA</a>. They describe transfer mechanisms such as standard contractual clauses where applicable. Whether particular agreements apply to this operator&apos;s plan/account and the resulting transfer assessment still need confirmation; linking a provider document does not establish that it has been executed.</p>
      </LegalSection>
      <LegalSection title="Your choices and rights">
        <p>Depending on applicable law, you may have rights to access, correct or delete your personal information, restrict or object to processing, and receive certain information in a portable form. Where processing relies on consent, you can withdraw it.</p>
        <p>Contact <a className="underline" href="mailto:miguelrodes24@gmail.com">miguelrodes24@gmail.com</a> to make a request. You may also complain to the data-protection authority competent for your circumstances.</p>
        <p>You can browse public pages without providing an account. Access to recruiter management requires the supplied demo sign-in; your own personal email or account is not required. This site does not make automated decisions about actual visitors with legal or similarly significant effects. Synthetic admissions and access assignments are demonstration records, not real-world decisions.</p>
      </LegalSection>
    </LegalPage>
  );
}

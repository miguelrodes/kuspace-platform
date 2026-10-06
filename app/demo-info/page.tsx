import { LegalPage, LegalSection } from "@/components/demo/legal-page";
import { demoAssetSources } from "@/lib/demo-asset-sources";

export default function DemoInfoPage() {
  return (
    <LegalPage title="Demo information & credits">
      <LegalSection title="About this project">
        <p>KUSPACE is an independent software portfolio project designed and developed by Miguel Rodés Knuth. This website demonstrates event-management interfaces and workflows for evaluation by potential employers and other visitors. It is not operated by a nightclub, event promoter, or ticketing business.</p>
      </LegalSection>
      <LegalSection title="Historical and demonstration data">
        <p>Some venue names, artist names, event dates and lineups are drawn from publicly available historical programming, principally from 2016.</p>
        <p>Guestlists, consumer accounts, orders, ticket-sales quantities, budgets, access records and other operational figures are synthetic demonstration data. Some room capacities and timetables are also reconstructed.</p>
        <p>Labels such as &ldquo;Live&rdquo; and &ldquo;Upcoming&rdquo; describe the demonstration scenario, not the current real-world status of an event. Financial and attendance figures must not be interpreted as the actual records of any venue, promoter or artist.</p>
      </LegalSection>
      <LegalSection title="No real transactions">
        <p>This demonstration does not sell valid event tickets, take real payments, make bookings or grant admission to any venue. Ticketing and purchase interfaces illustrate software functionality only.</p>
      </LegalSection>
      <LegalSection title="No affiliation">
        <p>KUSPACE is not affiliated with, endorsed by, or operated on behalf of Space Ibiza, DC10, Circoloco, Paradise, Resident Advisor, or any other venue, artist or event brand shown.</p>
      </LegalSection>
      <LegalSection title="Using the demo">
        <p>Use the supplied demonstration account where sign-in is required. Do not enter real guest information, personal contact details, payment-card details or confidential information.</p>
        <p>Demo workspaces are shared. Information entered into them may be visible to other visitors and may be changed or reset. Do not rely on the demo to retain information or operate a real event.</p>
      </LegalSection>
      <LegalSection title="Sources and artwork">
        <p>The credits below identify the local third-party artwork files and where they appear. Event-by-event historical source pages and image-level source pages were not retained in the seed and still need cataloguing. Where a source link is later recorded, it identifies where material was found; it does not itself establish permission to reproduce it.</p>
        <p>No ownership of third-party artwork, photographs, logos or trademarks is claimed. This website does not grant visitors permission to reuse third-party material.</p>
        <p>Image-level source, creator, licence and attribution records were not retained for the archived artwork below. These rights remain unresolved. Profile links and event listings are not evidence of image permission.</p>
        <div className="overflow-x-auto rounded-[var(--radius-surface)] border border-border">
          <table className="min-w-[42rem] w-full border-collapse text-left text-sm">
            <caption className="px-3 py-2 text-left text-muted">Archived local artwork inventory ({demoAssetSources.length} distinct files)</caption>
            <thead className="bg-panel-2 text-fg"><tr><th className="p-3">Asset / local path</th><th className="p-3">Relevant to</th><th className="p-3">Source / creator / licence / attribution</th></tr></thead>
            <tbody>{demoAssetSources.map((asset) => (
              <tr key={asset.localPath} className="border-t border-border align-top">
                <td className="break-all p-3"><span className="font-medium">{asset.id}</span><br /><code className="text-xs text-muted">{asset.localPath}</code></td>
                <td className="p-3">{asset.relevantTo.join("; ")}</td>
                <td className="p-3">Original source page: {asset.originalSourcePage ?? "not recorded"}<br />Creator/rightsholder: {asset.creatorOrRightsholder ?? "not verified"}<br />Licence/permission: {asset.licenceOrPermission ?? "not documented"}<br />Required attribution: {asset.requiredAttribution ?? "not verified"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </LegalSection>
      <LegalSection title="Contact and rights concerns">
        <p>For questions, corrections, privacy requests or concerns about material displayed here, contact Miguel Rodés Knuth at <a className="underline" href="mailto:miguelrodes24@gmail.com">miguelrodes24@gmail.com</a>.</p>
        <p>For an artwork concern, please identify the relevant page or image, your relationship to the rights holder, and the issue. I will review the request and respond.</p>
      </LegalSection>
    </LegalPage>
  );
}

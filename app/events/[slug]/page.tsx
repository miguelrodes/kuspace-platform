import { PublicTopNav } from "@/components/layout/public-top-nav";

type PublicEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicEventPage({
  params,
}: PublicEventPageProps) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicTopNav
        title="Nightlife Ops System"
        subtitle="Clubs, Brands, Collectives"
      />

      <main className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          {/* Public event detail scaffold for title, image, description, schedule, location, tickets, and host recruiter. */}
          <p className="text-body-sm uppercase tracking-widerish text-muted">
            Public Event
          </p>
          <h1 className="text-title font-semibold tracking-tightish">
            Event Details
          </h1>
          <p className="text-body text-muted">
            Expanded public event route scaffold for <code>{slug}</code>.
          </p>
        </div>
      </main>
    </div>
  );
}

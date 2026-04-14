import { PublicEventDetailPage } from "@/components/home/public-event-detail-page";

type RecruiterEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RecruiterEventPage({
  params,
}: RecruiterEventPageProps) {
  const { slug } = await params;

  return <PublicEventDetailPage slug={slug} audience="recruiter" />;
}

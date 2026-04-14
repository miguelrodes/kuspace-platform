import { PublicEventDetailPage } from "@/components/home/public-event-detail-page";

type ConsumerEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ConsumerEventPage({
  params,
}: ConsumerEventPageProps) {
  const { slug } = await params;

  return <PublicEventDetailPage slug={slug} audience="consumer" />;
}

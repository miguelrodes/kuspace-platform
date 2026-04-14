import { redirect } from "next/navigation";

type PublicEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicEventPage({ params }: PublicEventPageProps) {
  const { slug } = await params;
  redirect(`/cons/events/${slug}`);
}

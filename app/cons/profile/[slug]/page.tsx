import { RecruiterProfilePageView } from "@/components/profile/recruiter-profile-page";

type ConsumerRecruiterProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ConsumerRecruiterProfilePage({
  params,
}: ConsumerRecruiterProfilePageProps) {
  const { slug } = await params;

  return <RecruiterProfilePageView slug={slug} audience="consumer" />;
}

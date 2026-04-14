import { RecruiterProfilePageView } from "@/components/profile/recruiter-profile-page";

type RecruiterProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function RecruiterProfilePage({
  params,
}: RecruiterProfilePageProps) {
  const { slug } = await params;
  return <RecruiterProfilePageView slug={slug} audience="recruiter" />;
}

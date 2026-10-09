import { ConsumerProfilePageView } from "@/components/profile/consumer-profile-page";
import { isClerkConfigured } from "@/lib/auth/config";
import { cookies } from "next/headers";
import { isPublicDemoMode } from "@/lib/demo-mode";
import { SANDBOX_COOKIE } from "@/lib/demo/sandbox";

export default async function ConsumerProfileMePage() {
  const sandbox = isPublicDemoMode() && (await cookies()).get(SANDBOX_COOKIE)?.value === "1";
  return <ConsumerProfilePageView clerkEnabled={!sandbox && isClerkConfigured()} />;
}

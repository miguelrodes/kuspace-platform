import { ConsumerProfilePageView } from "@/components/profile/consumer-profile-page";
import { isClerkConfigured } from "@/lib/auth/config";

export default function ConsumerProfileMePage() {
  return <ConsumerProfilePageView clerkEnabled={isClerkConfigured()} />;
}

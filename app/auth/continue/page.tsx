import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { getCurrentAppActorService, selectCurrentAppActorService } from "@/lib/services/auth-actor-service";

type AuthContinuePageProps = {
  searchParams?: Promise<{
    role?: string;
  }>;
};

export default async function AuthContinuePage({
  searchParams,
}: AuthContinuePageProps) {
  const session = await getAuthSession();

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  const actor = await getCurrentAppActorService();

  if (actor.role === "recruiter") {
    redirect(actor.needsOrganizationSetup ? "/create-organization" : "/office");
  }

  if (actor.role === "consumer") {
    redirect("/conshome");
  }

  const params = searchParams ? await searchParams : undefined;
  const role = params?.role;

  if (role === "consumer" || role === "recruiter") {
    const result = await selectCurrentAppActorService(role);
    redirect(result.destination);
  }

  redirect("/select-role");
}

import { redirect } from "next/navigation";
import type { CurrentAppActor } from "@/lib/services/auth-actor-service";

export function requireOfficeRecruiterNavigation(actor: CurrentAppActor) {
  if (!actor.role || actor.needsActorSelection) {
    redirect("/select-role");
  }

  if (actor.role === "consumer") {
    redirect("/conshome");
  }

  if (actor.needsOrganizationSetup) {
    redirect("/create-organization");
  }
}

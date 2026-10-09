import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isPublicDemoMode } from "@/lib/demo-mode";
import { SANDBOX_COOKIE } from "@/lib/demo/sandbox";
import { SandboxOffice } from "@/components/demo/sandbox-office";

export default async function DemoOfficePage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  if (
    !isPublicDemoMode() ||
    (await cookies()).get(SANDBOX_COOKIE)?.value !== "1"
  )
    notFound();
  const { path = [] } = await params;
  return <SandboxOffice path={path} />;
}

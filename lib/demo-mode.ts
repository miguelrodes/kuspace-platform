export function isPublicDemoMode() {
  return process.env.KUSPACE_DEMO_MODE === "true";
}

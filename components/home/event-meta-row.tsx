import Link from "next/link";

type EventMetaRowProps = {
  location: string;
  recruiterName: string;
  recruiterSlug: string;
  audience?: "consumer" | "recruiter";
};

export function EventMetaRow({
  location,
  recruiterName,
  recruiterSlug,
  audience = "consumer",
}: EventMetaRowProps) {
  const profileHref =
    audience === "recruiter"
      ? `/recprofile/${recruiterSlug}`
      : `/cons/profile/${recruiterSlug}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted">
      <span>{location}</span>
      <Link
        href={profileHref}
        className="relative z-10 transition hover:text-fg"
      >
        {recruiterName}
      </Link>
    </div>
  );
}

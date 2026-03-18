import Link from "next/link";

type EventMetaRowProps = {
  location: string;
  recruiterName: string;
  recruiterSlug: string;
};

export function EventMetaRow({
  location,
  recruiterName,
  recruiterSlug,
}: EventMetaRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-body-sm text-muted">
      <span>{location}</span>
      <Link
        href={`/recprofile/${recruiterSlug}`}
        className="relative z-10 transition hover:text-fg"
      >
        {recruiterName}
      </Link>
    </div>
  );
}

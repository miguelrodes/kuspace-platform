type EventPosterProps = {
  imageUrl: string;
  imageAlt: string;
  aspectClassName?: string;
};

export function EventPoster({
  imageUrl,
  imageAlt,
  aspectClassName = "aspect-[16/9]",
}: EventPosterProps) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel">
      <div
        role="img"
        aria-label={imageAlt}
        className={`${aspectClassName} w-full bg-cover bg-center`}
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.45)), url(${imageUrl})`,
        }}
      />
    </div>
  );
}

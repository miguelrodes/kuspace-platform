import type { RecruiterProfile } from "@/types/profile";

type ProfileHeroProps = {
  profile: RecruiterProfile;
  onSettingsClick?: () => void;
  settingsNotice?: string;
};

export function ProfileHero({ profile, onSettingsClick, settingsNotice }: ProfileHeroProps) {
  return (
    <section className="relative overflow-hidden bg-panel">
      <div
        className="h-52 w-full bg-cover bg-center md:h-56"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.18)), url(${profile.media?.bannerImageUrl})`,
        }}
      />

      {onSettingsClick ? (
        <button
          type="button"
          aria-label="Open recruiter settings"
          title="Settings"
          onClick={onSettingsClick}
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border bg-black/25 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ borderColor: "hsl(var(--border) / 0.5)" }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
          >
            <path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.35 7.35 0 0 0-1.63-.95l-.36-2.54a.49.49 0 0 0-.49-.42h-3.84a.49.49 0 0 0-.49.42l-.36 2.54c-.59.23-1.14.55-1.63.95l-2.39-.96a.5.5 0 0 0-.6.22L2.66 8.84a.5.5 0 0 0 .12.64l2.03 1.58a6.12 6.12 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.49.4 1.04.72 1.63.95l.36 2.54c.04.24.25.42.49.42h3.84c.24 0 .45-.18.49-.42l.36-2.54c.59-.23 1.14-.55 1.63-.95l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.6ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
          </svg>
        </button>
      ) : null}

      {onSettingsClick && settingsNotice ? (
        <p
          role="status"
          className="absolute right-4 top-16 z-20 max-w-[calc(100%-2rem)] rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-1.5 text-body-sm text-fg shadow-lg"
        >
          {settingsNotice}
        </p>
      ) : null}

      <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5">
        <div className="-mt-1 flex items-start gap-4 md:-mt-2">
          <div className="h-36 w-36 overflow-hidden rounded-full border border-white/15 bg-panel md:h-40 md:w-40">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${profile.media?.avatarImageUrl})`,
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 md:mt-1">
          <div className="space-y-1">
            <h1
              className="profile-content-reveal profile-name-reveal tracking-[0.04em]"
              style={{
                color: "#FFFFFF",
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "2.5rem",
                lineHeight: "1.1",
              }}
            >
              {profile.displayName}
            </h1>
          </div>

          <p
            className="profile-content-reveal profile-location-reveal text-heading-sm text-right"
            style={{
              color: "#FFFFFF",
              lineHeight: "1.2",
            }}
          >
            {profile.location?.displayText}
          </p>
        </div>
      </div>
    </section>
  );
}

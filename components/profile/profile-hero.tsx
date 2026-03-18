import type { RecruiterProfile } from "@/types/profile";

type ProfileHeroProps = {
  profile: RecruiterProfile;
};

export function ProfileHero({ profile }: ProfileHeroProps) {
  return (
    <section className="relative overflow-hidden bg-panel">
      <div
        className="h-52 w-full bg-cover bg-center md:h-56"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.18)), url(${profile.media?.bannerImageUrl})`,
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5">
        <div className="-mt-1 flex items-start gap-4 md:-mt-2">
          <div className="h-36 w-36 overflow-hidden rounded-full border border-white/15 bg-panel-2 md:h-40 md:w-40">
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
              className="tracking-[0.04em]"
              style={{
                color: "#FFFFFF",
                fontSize: "2.5rem",
                lineHeight: "1.1",
              }}
            >
              {profile.displayName}
            </h1>
          </div>

          <p className="text-title" style={{ color: "#FFFFFF" }}>
            {profile.location?.displayText}
          </p>
        </div>
      </div>
    </section>
  );
}

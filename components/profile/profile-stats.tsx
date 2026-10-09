import Link from "next/link";
import type { RecruiterProfile } from "@/types/profile";
import { MetaTag } from "@/components/ui/meta-tag";

type ProfileStatsProps = {
  profile: RecruiterProfile;
};

function formatFollowers(value?: number) {
  if (!value) {
    return "0";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function ProfileStats({ profile }: ProfileStatsProps) {
  const soundProfile = profile.soundProfile;
  const stats = profile.stats;
  const links = profile.links;
  const showFollowers = Boolean(
    stats?.display.followers && typeof stats.followers === "number",
  );
  const showPublicRating = Boolean(
    stats?.display.publicRating && typeof stats.publicRating === "number",
  );

  return (
    <div className="space-y-7">
      {showFollowers || showPublicRating ? (
        <div className="text-body space-y-1">
          {showFollowers ? (
            <div className="grid grid-cols-[5rem_1fr] items-baseline gap-x-3">
              <p style={{ color: "#FFFFFF" }}>Followers:</p>
              <p style={{ color: "#FFFFFF" }}>
                {formatFollowers(stats?.followers)}
              </p>
            </div>
          ) : null}
          {showPublicRating ? (
            <div className="grid grid-cols-[5rem_1fr] items-baseline gap-x-3">
              <p style={{ color: "#FFFFFF" }}>Rating:</p>
              <p style={{ color: "#FFFFFF" }}>
                {stats?.publicRating?.toFixed(1)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <p
          className="text-subheading tracking-tightish uppercase"
          style={{ color: "#FFFFFF" }}
        >
          Sound Profile
        </p>
        <div className="profile-content-reveal profile-sound-reveal flex flex-wrap items-start gap-2 pl-0">
          {soundProfile?.genres.map((genre) => (
            <MetaTag key={genre}>{genre}</MetaTag>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p
          className="text-subheading tracking-tightish uppercase"
          style={{ color: "#FFFFFF" }}
        >
          Rooms
        </p>
        <div className="profile-content-reveal profile-rooms-reveal text-body-sm text-muted space-y-1">
          {soundProfile?.rooms?.map((room) => (
            <div
              key={room.name}
              className="grid grid-cols-[5.75rem_4.5rem] items-baseline gap-x-3"
            >
              <p>{room.name}</p>
              <p
                className="text-left"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {room.capacity.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p
          className="text-subheading tracking-tightish uppercase"
          style={{ color: "#FFFFFF" }}
        >
          Links
        </p>
        <div className="profile-content-reveal profile-links-reveal text-body text-muted space-y-1">
          {links?.instagram ? (
            <Link
              href={links.instagram}
              className="hover:text-fg block transition"
            >
              Instagram
            </Link>
          ) : null}
          {links?.residentAdvisor ? (
            <Link
              href={links.residentAdvisor}
              className="hover:text-fg block transition"
            >
              Resident Advisor
            </Link>
          ) : null}
          {links?.website ? (
            <Link
              href={links.website}
              className="hover:text-fg block transition"
            >
              Website
            </Link>
          ) : null}
          {links?.mapsLocation ? (
            <Link
              href={links.mapsLocation}
              className="hover:text-fg block transition"
            >
              Maps
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

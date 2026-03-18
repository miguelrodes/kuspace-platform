import { ReactNode } from "react";
type ProfileSidebarCardProps = {
  children: ReactNode;
};

export function ProfileSidebarCard({ children }: ProfileSidebarCardProps) {
  return <div className="space-y-5 px-4 py-8 text-body">{children}</div>;
}

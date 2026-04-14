import type { ReactNode } from "react";

type EditorSectionTitleProps = {
  children: ReactNode;
};

export function EditorSectionTitle({ children }: EditorSectionTitleProps) {
  return (
    <h2
      className="text-heading-sm uppercase"
      style={{
        fontFamily: "var(--font-space-grotesk)",
        fontWeight: 400,
        letterSpacing: "0.06em",
        color: "#ac1b2a",
      }}
    >
      {children}
    </h2>
  );
}

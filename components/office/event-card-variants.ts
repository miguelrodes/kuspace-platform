export type EventCardVariant = "large" | "medium" | "compact";

export const profileEventGridClassName =
  "grid justify-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(13.25rem,13.25rem))]";

export const eventCardVariants = {
  large: {
    container:
      "group block h-full min-h-[17.5rem] overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2.5 transition hover:border-white/20",
    posterAspect: "aspect-[2.2/1]",
    content: "flex h-full flex-col gap-3",
    body: "flex flex-1 flex-col space-y-1.5",
    title: "min-h-[2.8rem] overflow-hidden text-body-lg font-medium text-fg",
    lineup: "mt-0 min-h-[2.3rem] overflow-hidden text-body-sm text-muted",
    footer: "mt-auto flex items-center justify-between gap-2 pt-1.5 text-body-sm text-muted",
  },
  medium: {
    container:
      "group relative h-full min-h-[20rem] overflow-hidden rounded-[var(--radius-surface)] border border-border bg-panel px-3 py-3 transition hover:border-white/20",
    posterAspect: "aspect-[2/1]",
    content: "relative z-10 flex h-full flex-col gap-3",
    body: "flex flex-1 flex-col space-y-1.5",
    title: "overflow-hidden whitespace-nowrap text-body-lg font-medium text-fg text-ellipsis",
    lineup: "mt-0.5 min-h-[1.35rem] overflow-hidden text-body-sm text-muted",
    footer: "pt-0",
  },
  compact: {
    container:
      "group block overflow-hidden rounded-[var(--radius-surface)] border bg-panel transition hover:border-white/20",
    compactPosterAspect: "aspect-[2.6/1]",
    defaultPosterAspect: "aspect-[16/9]",
    compactBody: "space-y-0.5 px-1.5 py-1",
    defaultBody: "space-y-0.5 px-3 py-3",
    compactTitle: "overflow-hidden whitespace-nowrap text-[0.68rem] text-fg text-ellipsis",
    defaultTitle: "overflow-hidden whitespace-nowrap text-body text-fg text-ellipsis",
    compactMeta: "overflow-hidden text-[0.62rem] text-muted",
    defaultMeta: "overflow-hidden text-body-sm text-muted",
  },
} as const;

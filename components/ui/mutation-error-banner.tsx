"use client";

type MutationErrorBannerProps = {
  message: string;
  onDismiss: () => void;
};

export function MutationErrorBanner({ message, onDismiss }: MutationErrorBannerProps) {
  return (
    <div className="mx-auto mt-3 flex max-w-[96rem] items-start justify-between gap-4 rounded-[var(--radius-button-tag)] border border-[var(--accent-hex)]/35 bg-[var(--accent-hex)]/8 px-3 py-2">
      <p className="text-body-sm text-fg">{message}</p>
      <button
        type="button"
        className="shrink-0 text-body-sm uppercase tracking-[0.12em] text-[var(--accent-hex)] transition hover:opacity-80"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  );
}

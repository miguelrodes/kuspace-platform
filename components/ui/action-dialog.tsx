"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const DIALOG_TITLE_CLASS = "text-body-lg uppercase tracking-widerish";
export const DIALOG_FIELD_LABEL_CLASS =
  "text-body-sm uppercase tracking-widerish text-muted";
export const DIALOG_ACTION_CLASS =
  "h-8 border-0 bg-transparent px-4 text-body-sm uppercase tracking-[0.12em] outline-none";

type BaseDialogProps = {
  title: string;
  message?: string;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  confirmTone = "warning",
  maxWidthClassName = "max-w-lg",
  panelClassName = "",
  messageClassName = "",
  actionsClassName = "",
  confirmButtonClassName = "",
  titleColor,
  titleClassName = "",
  onClose,
  onConfirm,
}: BaseDialogProps & {
  confirmLabel?: string;
  confirmTone?: "warning" | "accent";
  hideClose?: boolean;
  maxWidthClassName?: string;
  panelClassName?: string;
  messageClassName?: string;
  actionsClassName?: string;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
  titleColor?: string;
  titleClassName?: string;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className={`w-full ${maxWidthClassName} rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl ${panelClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h3
            className={`${DIALOG_TITLE_CLASS} ${titleClassName}`.trim()}
            style={{ color: titleColor ?? "#FFFFFF" }}
          >
            {title}
          </h3>
        </div>

        {message ? (
          <p
            className={`${messageClassName || "mt-4"} whitespace-pre-line text-body text-fg`.trim()}
          >
            {message}
          </p>
        ) : null}

        <div className={`flex justify-center ${actionsClassName || "mt-5"}`.trim()}>
          <Button
            type="button"
            variant="ghost"
            className={`${DIALOG_ACTION_CLASS} ${confirmButtonClassName}`.trim()}
            style={{ color: confirmTone === "warning" ? "hsl(var(--warning))" : "var(--accent-hex)" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PromptDialog({
  title,
  message,
  label,
  placeholder,
  value,
  confirmLabel = "Done",
  hideLabel = false,
  panelClassName = "",
  fieldClassName = "",
  actionsClassName = "",
  titleColor,
  onChange,
  onClose,
  onConfirm,
}: BaseDialogProps & {
  label: string;
  placeholder?: string;
  value: string;
  confirmLabel?: string;
  hideClose?: boolean;
  hideLabel?: boolean;
  panelClassName?: string;
  fieldClassName?: string;
  actionsClassName?: string;
  titleColor?: string;
  cancelButtonClassName?: string;
  onChange: (nextValue: string) => void;
  onConfirm: () => void;
}) {
  const isValid = value.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl ${panelClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h3
            className={DIALOG_TITLE_CLASS}
            style={{ color: titleColor ?? "#FFFFFF" }}
          >
            {title}
          </h3>
        </div>

        {message ? (
          <p className={`${message ? "mt-4" : ""} text-body text-fg`.trim()}>{message}</p>
        ) : null}

        <div className={`${fieldClassName || "mt-4"}`.trim()}>
          {hideLabel ? null : (
            <label className={DIALOG_FIELD_LABEL_CLASS}>{label}</label>
          )}
          <Input
            autoFocus
            value={value}
            placeholder={placeholder}
            className={`${hideLabel ? "" : "mt-1"} text-body text-white/72`.trim()}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>

        <div className={`${actionsClassName || "mt-5"} flex justify-center`.trim()}>
          <Button
            type="button"
            variant="ghost"
            className={DIALOG_ACTION_CLASS}
            style={{ color: "var(--accent-hex)" }}
            disabled={!isValid}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

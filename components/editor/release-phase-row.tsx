"use client";

import { useMemo, useRef, useState } from "react";
import { ConfirmDialog, DIALOG_TITLE_CLASS } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import type { TicketReleaseMode, TicketTierStatus } from "@/types/event";

export type TicketPhaseDraft = {
  id: string;
  name: string;
  price: string;
  quantityAvailable: string;
  quantitySold: string;
  status: TicketTierStatus;
  salesStart: string;
  salesEnd: string;
  releaseMode: TicketReleaseMode;
};

type ReleasePhaseRowProps = {
  value: TicketPhaseDraft;
  disabled?: boolean;
  open: boolean;
  requireTitle?: boolean;
  onClose: () => void;
  onChange: (nextValue: TicketPhaseDraft) => void;
};

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type PickerInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function ReleasePhaseRow({
  value,
  disabled = false,
  open,
  requireTitle = false,
  onClose,
  onChange,
}: ReleasePhaseRowProps) {
  const controlClassName =
    "!h-[1.625rem] !px-2.5 !py-0 !text-sm !leading-none";
  const dropdownControlClassName =
    "!h-[1.625rem] w-full rounded-[var(--radius-surface)] border border-border bg-panel !px-2.5 !text-sm !leading-none text-white/72 outline-none focus:border-[var(--accent-hex)]";
  const dateControlClassName =
    `editor-date-time-input ${controlClassName}`;
  const [soldMode, setSoldMode] = useState<"absolute" | "percent">("absolute");
  const [showTitleError, setShowTitleError] = useState(false);
  const [showQuantityError, setShowQuantityError] = useState(false);
  const [showQuantitySoldError, setShowQuantitySoldError] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TicketTierStatus | null>(null);
  const salesStartRef = useRef<PickerInputElement | null>(null);
  const salesEndRef = useRef<PickerInputElement | null>(null);
  const soldOutLocked = !disabled && value.status === "sold_out";
  const fieldsDisabled = disabled || soldOutLocked;

  const soldPercentage = useMemo(() => {
    const qty = parseNumber(value.quantityAvailable);
    const sold = parseNumber(value.quantitySold);
    if (qty <= 0) return 0;
    return Math.round((sold / qty) * 100);
  }, [value.quantityAvailable, value.quantitySold]);
  const soldCount = parseNumber(value.quantitySold);
  const statusOptions = [
    { value: "live", label: "Live" },
    { value: "upcoming", label: "Upcoming" },
    { value: "sold_out", label: "Sold Out" },
  ];
  const activationOptions = [
    { value: "manual", label: "Manual" },
    { value: "after_previous_sold_out", label: "After previous sold out" },
  ];

  function openPicker(input: PickerInputElement | null) {
    if (!input) {
      return;
    }

    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  }

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5 py-10"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[36rem] rounded-[var(--radius-surface)] border border-border bg-panel px-5 pt-4 pb-3 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="space-y-4">
          <div style={{ marginBottom: "0.5px" }}>
            <div>
              <p className={`${DIALOG_TITLE_CLASS} text-[#FFFFFF]`}>
                Phase Details
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <label className="text-body-sm uppercase tracking-widerish text-muted">Title</label>
            <Input
              value={value.name}
              placeholder="Phase title"
              className={`mt-0.5 w-full text-white/72 ${controlClassName}`}
              disabled={fieldsDisabled}
              onChange={(event) => {
                if (showTitleError && event.target.value.trim()) {
                  setShowTitleError(false);
                }
                onChange({ ...value, name: event.target.value });
              }}
            />
            {requireTitle && showTitleError ? (
              <p className="mt-1 text-body-sm text-[#facc15]">Phase title is required.</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-[10rem_10rem_11rem]">
            <div className="min-w-0">
              <div className="flex min-h-[1.5rem] items-end justify-between gap-3">
                <label className="text-body-sm uppercase tracking-widerish text-muted">Sold</label>
                <div className="inline-flex items-center gap-0">
                  <button
                    type="button"
                    className={`inline-flex h-4 items-center rounded-[var(--radius-button-tag)] px-1 text-sm uppercase tracking-[0.08em] leading-none transition ${
                      soldMode === "absolute"
                        ? "bg-transparent text-[#FFFFFF]"
                        : "text-muted hover:text-fg"
                    }`}
                    disabled={fieldsDisabled}
                    onClick={() => setSoldMode("absolute")}
                  >
                    <span className="inline-flex items-center leading-none">Q</span>
                  </button>
                  <span className="inline-flex h-4 items-center px-0 text-sm leading-none text-muted">|</span>
                  <button
                    type="button"
                    className={`inline-flex h-4 items-center rounded-[var(--radius-button-tag)] px-1 text-sm uppercase tracking-[0.08em] leading-none transition ${
                      soldMode === "percent"
                        ? "bg-transparent text-[#FFFFFF]"
                        : "text-muted hover:text-fg"
                    }`}
                    disabled={fieldsDisabled}
                    onClick={() => setSoldMode("percent")}
                  >
                    <span className="inline-flex items-center leading-none">%</span>
                  </button>
                </div>
              </div>
              {soldMode === "absolute" ? (
                <Input
                  value={value.quantitySold}
                  inputMode="numeric"
                  className={`mt-0.5 text-white/72 ${controlClassName}`}
                  disabled={fieldsDisabled}
                  onChange={(event) => onChange({ ...value, quantitySold: event.target.value })}
                />
              ) : (
                <Input
                  value={`${soldPercentage}%`}
                  readOnly
                  className={`mt-0.5 text-fg ${controlClassName}`}
                  disabled
                />
              )}
            </div>
            <div>
              <div className="flex min-h-[1.5rem] items-end">
                <label className="text-body-sm uppercase tracking-widerish text-muted">Status</label>
              </div>
              <DropdownSelect
                value={value.status}
                options={statusOptions}
                className={`mt-0.5 ${dropdownControlClassName}`}
                optionClassName="text-body-sm"
                disabled={disabled}
                onChange={(nextValue) => {
                  const nextStatus = nextValue as TicketTierStatus;
                  if (soldOutLocked && nextStatus !== "sold_out") {
                    setPendingStatus(nextStatus);
                    return;
                  }
                  onChange({
                    ...value,
                    status: nextStatus,
                  });
                }}
              />
            </div>
            <div>
              <div className="flex min-h-[1.5rem] items-end">
                <label className="text-body-sm uppercase tracking-widerish text-muted">Activation</label>
              </div>
              <DropdownSelect
                value={value.releaseMode}
                options={activationOptions}
                className={`mt-0.5 ${dropdownControlClassName}`}
                optionClassName="text-body-sm"
                disabled={fieldsDisabled}
                onChange={(nextValue) =>
                  onChange({
                    ...value,
                    releaseMode: nextValue as TicketReleaseMode,
                  })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[10rem_10rem]">
            <div className="w-[10rem]">
              <label className="text-body-sm uppercase tracking-widerish text-muted">Price</label>
              <div className="relative mt-0.5">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-body-sm text-muted">
                  €
                </span>
                <Input
                  value={value.price}
                  inputMode="decimal"
                  className={`w-full !pl-6 !pr-2.5 text-white/72 ${controlClassName}`}
                  disabled={fieldsDisabled}
                  onChange={(event) => onChange({ ...value, price: event.target.value })}
                />
              </div>
            </div>
            <div className="w-[10rem]">
              <label className="text-body-sm uppercase tracking-widerish text-muted">Qty Available</label>
              <Input
                value={value.quantityAvailable}
                inputMode="numeric"
                className={`mt-0.5 w-full text-white/72 ${controlClassName}`}
                disabled={fieldsDisabled}
                onChange={(event) => {
                  if (showQuantityError && parseNumber(event.target.value) > 0) {
                    setShowQuantityError(false);
                  }
                  if (showQuantitySoldError && parseNumber(event.target.value) >= soldCount) {
                    setShowQuantitySoldError(false);
                  }
                  onChange({ ...value, quantityAvailable: event.target.value });
                }}
              />
              {showQuantityError ? (
                <p className="mt-1 text-body-sm text-[#facc15]">QTY must be &gt; 0</p>
              ) : null}
              {showQuantitySoldError ? (
                <p className="mt-1 text-body-sm text-[#facc15]">QTY must be &gt;= sold</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[10rem_10rem]">
            <div className="min-w-0">
              <label className="text-body-sm uppercase tracking-widerish text-muted">Sales Start</label>
              <div className="relative mt-0.5">
                <Input
                  ref={salesStartRef}
                  type="datetime-local"
                  value={value.salesStart}
                  className={`w-full !pr-8 ${dateControlClassName} text-muted`}
                  disabled={fieldsDisabled || value.releaseMode !== "manual"}
                  onChange={(event) => onChange({ ...value, salesStart: event.target.value })}
                />
                <button
                  type="button"
                  aria-label="Open sales start picker"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition hover:text-fg disabled:opacity-40"
                  disabled={fieldsDisabled || value.releaseMode !== "manual"}
                  onClick={() => openPicker(salesStartRef.current)}
                >
                  <CalendarIcon />
                </button>
              </div>
            </div>
            <div className="min-w-0">
              <label className="text-body-sm uppercase tracking-widerish text-muted">Sales End</label>
              <div className="relative mt-0.5">
                <Input
                  ref={salesEndRef}
                  type="datetime-local"
                  value={value.salesEnd}
                  className={`w-full !pr-8 ${dateControlClassName} text-muted`}
                  disabled={fieldsDisabled || value.releaseMode !== "manual"}
                  onChange={(event) => onChange({ ...value, salesEnd: event.target.value })}
                />
                <button
                  type="button"
                  aria-label="Open sales end picker"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition hover:text-fg disabled:opacity-40"
                  disabled={fieldsDisabled || value.releaseMode !== "manual"}
                  onClick={() => openPicker(salesEndRef.current)}
                >
                  <CalendarIcon />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-4 text-body-sm uppercase tracking-[0.08em]"
              style={{ color: "var(--accent-hex)" }}
              onClick={() => {
                if (requireTitle && !value.name.trim()) {
                  setShowTitleError(true);
                  return;
                }
                if (parseNumber(value.quantityAvailable) <= 0) {
                  setShowQuantityError(true);
                  return;
                }
                if (parseNumber(value.quantityAvailable) < soldCount) {
                  setShowQuantitySoldError(true);
                  return;
                }
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
      </div>

      {pendingStatus ? (
        <ConfirmDialog
          title="Reopen Sold Out Phase"
          message="This phase is marked Sold Out. Changing its status will reopen editing and may make tickets available again."
          confirmLabel="Continue"
          confirmTone="warning"
          hideClose
          onClose={() => setPendingStatus(null)}
          onConfirm={() => {
            onChange({
              ...value,
              status: pendingStatus,
            });
            setPendingStatus(null);
          }}
        />
      ) : null}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DIALOG_ACTION_CLASS, DIALOG_FIELD_LABEL_CLASS, DIALOG_TITLE_CLASS, PromptDialog } from "@/components/ui/action-dialog";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { EditorSectionHeader } from "@/components/editor/editor-section-header";

const presetCategories = [
  "Sound",
  "Production",
  "Security",
  "Logistics",
  "Drinks",
] as const;

export type BudgetItemDraft = {
  id: string;
  category: string;
  title: string;
  amount: string;
  paid: boolean;
  notes: string;
};

export type BudgetFormState = {
  budgetCap: string;
  doorTicketRevenue: string;
  items: BudgetItemDraft[];
};

type BudgetTabProps = {
  value: BudgetFormState;
  appTicketRevenue: number;
  onChange: (nextState: BudgetFormState) => void;
};

type ExpenseDraft = {
  category: string;
  customCategory: string;
  title: string;
  amount: string;
  paid: boolean;
  notes: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const absoluteValue = currencyFormatter
    .format(Math.abs(safeValue))
    .replace("€", "€ ");

  return safeValue < 0 ? absoluteValue.replace("€ ", "€ -") : absoluteValue;
}

function parseAmount(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumberInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, "");
  const [integerPartRaw = "", ...decimalParts] = sanitized.split(".");
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "");
  const groupedInteger = (integerPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimalPart = decimalParts.join("");

  if (sanitized.includes(".")) {
    return `${groupedInteger}.${decimalPart}`;
  }

  return integerPartRaw === "" ? "" : groupedInteger;
}

function StatusPill({
  paid,
  onToggle,
  className = "",
}: {
  paid: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-7 w-[5.75rem] items-center justify-center rounded-[var(--radius-surface)] border px-2 text-sm uppercase tracking-[0.06em] transition ${
        paid
          ? "border-border text-[#FFFFFF]"
          : "border-[hsl(var(--warning))] text-[hsl(var(--warning))]"
      } ${className}`}
      onClick={onToggle}
    >
      {paid ? "Paid" : "Unpaid"}
    </button>
  );
}

function AddExpenseModal({
  categories,
  onClose,
  onConfirm,
}: {
  categories: string[];
  onClose: () => void;
  onConfirm: (draft: ExpenseDraft) => void;
}) {
  const [draft, setDraft] = useState<ExpenseDraft>({
    category: categories[0] ?? presetCategories[0],
    customCategory: "",
    title: "",
    amount: "",
    paid: false,
    notes: "",
  });

  const isCustomCategory = draft.category === "__custom__";
  const resolvedCategory = isCustomCategory ? draft.customCategory.trim() : draft.category;
  const isValid = draft.title.trim() && resolvedCategory && draft.amount.trim();
  const categoryOptions = [
    ...categories.map((category) => ({ value: category, label: category })),
    { value: "__custom__", label: "Custom" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-[var(--radius-surface)] border border-border bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className={`${DIALOG_TITLE_CLASS} text-[#FFFFFF]`}>
            Add Cost
          </h3>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>Category</label>
            <DropdownSelect
              value={draft.category}
              options={categoryOptions}
              className="mt-1 h-8 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-3 text-body text-white/72 outline-none focus:border-[var(--accent-hex)]"
              optionClassName="text-body"
              onChange={(nextValue) =>
                setDraft((current) => ({
                  ...current,
                  category: nextValue,
                }))
              }
            />
          </div>

          {isCustomCategory ? (
            <div>
              <label className={DIALOG_FIELD_LABEL_CLASS}>Custom Category</label>
              <Input
                value={draft.customCategory}
                placeholder="Category"
                className="mt-1 text-body text-white/72"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    customCategory: event.target.value,
                  }))
                }
              />
            </div>
          ) : (
            <div>
              <label className={DIALOG_FIELD_LABEL_CLASS}>Status</label>
              <div className="mt-1 flex h-8 items-center">
                <StatusPill
                  paid={draft.paid}
                  className="h-6 w-[5.25rem]"
                  onToggle={() =>
                    setDraft((current) => ({
                      ...current,
                      paid: !current.paid,
                    }))
                  }
                />
              </div>
            </div>
          )}

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>Title</label>
            <Input
              value={draft.title}
              placeholder="Cost title"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className={DIALOG_FIELD_LABEL_CLASS}>Amount</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body text-muted">
                €
              </span>
              <Input
                value={draft.amount}
                inputMode="decimal"
                placeholder="0"
                className="pl-7 text-body text-white/72"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    amount: formatNumberInput(event.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={DIALOG_FIELD_LABEL_CLASS}>Notes</label>
            <Input
              value={draft.notes}
              placeholder="Optional notes"
              className="mt-1 text-body text-white/72"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            className={DIALOG_ACTION_CLASS}
            style={{ color: "var(--accent-hex)" }}
            disabled={!isValid}
            onClick={() => onConfirm(draft)}
          >
            Add Cost
          </Button>
        </div>
      </div>
    </div>
  );
}

function createBudgetItemDraft(draft: ExpenseDraft): BudgetItemDraft {
  return {
    id: `budget-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: draft.category === "__custom__" ? draft.customCategory.trim() : draft.category,
    title: draft.title.trim(),
    amount: draft.amount.trim(),
    paid: draft.paid,
    notes: draft.notes.trim(),
  };
}

export function BudgetTab({ value, appTicketRevenue, onChange }: BudgetTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addedCategories, setAddedCategories] = useState<string[]>([]);

  const metrics = useMemo(() => {
    const totalCosts = value.items.reduce((sum, item) => sum + parseAmount(item.amount), 0);
    const doorTicketRevenue = parseAmount(value.doorTicketRevenue);
    const totalTicketRevenue = appTicketRevenue + doorTicketRevenue;
    const paid = value.items
      .filter((item) => item.paid)
      .reduce((sum, item) => sum + parseAmount(item.amount), 0);
    const unpaid = totalCosts - paid;
    const budgetRemaining = parseAmount(value.budgetCap) - totalCosts;
    const net = totalTicketRevenue - totalCosts;

    return {
      totalCosts,
      doorTicketRevenue,
      appTicketRevenue,
      totalTicketRevenue,
      paid,
      unpaid,
      budgetRemaining,
      net,
    };
  }, [appTicketRevenue, value.budgetCap, value.doorTicketRevenue, value.items]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...presetCategories,
          ...addedCategories,
          ...value.items.map((item) => item.category).filter(Boolean),
        ]),
      ),
    [addedCategories, value.items],
  );

  const updateItem = (id: string, field: keyof BudgetItemDraft, nextValue: string | boolean) => {
    onChange({
      ...value,
      items: value.items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: nextValue,
            }
          : item,
      ),
    });
  };

  const deleteItem = (id: string) => {
    onChange({
      ...value,
      items: value.items.filter((item) => item.id !== id),
    });
  };

  const handleAddCost = (draft: ExpenseDraft) => {
    onChange({
      ...value,
      items: [...value.items, createBudgetItemDraft(draft)],
    });
    setShowAddModal(false);
  };

  const handleAddCategory = () => {
    const trimmedCategory = newCategoryName.trim();

    if (!trimmedCategory) {
      return;
    }

    if (categories.some((category) => category.toLowerCase() === trimmedCategory.toLowerCase())) {
      setShowAddCategoryModal(false);
      setNewCategoryName("");
      return;
    }

    setAddedCategories((current) => [...current, trimmedCategory]);
    setShowAddCategoryModal(false);
    setNewCategoryName("");
  };

  return (
    <section className="rounded-[var(--radius-surface)] border border-border bg-panel p-5">
      <div className="space-y-5">
        <EditorSectionHeader
          title="Costs"
          actions={
            <>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-4 text-body-sm uppercase tracking-[0.12em]"
              style={{ color: "var(--accent-hex)" }}
              onClick={() => setShowAddCategoryModal(true)}
            >
              Add Category
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-8 pl-4 pr-0 text-body-sm uppercase tracking-[0.12em]"
              style={{ color: "var(--accent-hex)" }}
              onClick={() => setShowAddModal(true)}
            >
              Add Cost
            </Button>
            </>
          }
        />

        <div className="-mt-2 grid gap-4 md:grid-cols-[12rem]">
          <div>
            <label className="text-body uppercase tracking-widerish text-fg">Budget Cap</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body text-muted">
                €
              </span>
              <Input
                value={value.budgetCap}
                inputMode="decimal"
                placeholder="0"
                className="!h-7 border-border bg-panel py-0 pl-7 text-body text-white/72"
                style={{ height: "1.875rem", minHeight: "1.875rem", maxHeight: "1.875rem" }}
                onChange={(event) =>
                  onChange({
                    ...value,
                    budgetCap: formatNumberInput(event.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">Total Ticket Revenue</p>
              <p className="text-body text-fg">{formatCurrency(metrics.totalTicketRevenue)}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">Budget Remaining</p>
              <p className="text-body text-fg">{formatCurrency(metrics.budgetRemaining)}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">Total Cost</p>
              <p className="text-body text-fg">{formatCurrency(metrics.totalCosts)}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">Net</p>
              <p className="text-body text-fg">{formatCurrency(metrics.net)}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">Door Revenue</p>
              <div className="ml-auto flex w-[5.5rem] items-center justify-end text-body text-fg tabular-nums">
                <span className="shrink-0 text-right">€&nbsp;</span>
                <input
                  value={value.doorTicketRevenue}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-[4rem] bg-transparent p-0 text-right text-body text-fg outline-none placeholder:text-muted"
                  onChange={(event) =>
                    onChange({
                      ...value,
                      doorTicketRevenue: formatNumberInput(event.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">App Revenue</p>
              <p className="text-body text-fg">{formatCurrency(metrics.appTicketRevenue)}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">Paid</p>
              <p className="text-body text-fg">{formatCurrency(metrics.paid)}</p>
            </div>
          </div>
          <div className="rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="whitespace-nowrap text-body-sm uppercase tracking-widerish text-muted">Unpaid</p>
              <p className="text-body text-fg">{formatCurrency(metrics.unpaid)}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-visible rounded-[var(--radius-surface)] border border-border bg-panel">
          <div className="grid gap-2 border-b border-border px-4 py-3 text-body-sm uppercase tracking-widerish text-muted md:grid-cols-[8.75rem_minmax(0,1.35fr)_5.75rem_6.75rem_minmax(0,3.05fr)_1rem]">
            <div className="flex h-7 items-center">
              <p>Category</p>
            </div>
            <div className="flex h-7 items-center">
              <p>Title</p>
            </div>
            <div className="flex h-7 items-center">
              <p>Status</p>
            </div>
            <div className="flex h-7 items-center">
              <p>Amount</p>
            </div>
            <div className="flex h-7 items-center">
              <p>Notes</p>
            </div>
            <div />
          </div>

          {value.items.length === 0 ? (
            <div className="px-4 py-4 text-body-sm text-muted">
              No costs added yet. Add the first item to start the ledger.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {value.items.map((item) => (
                <div
                  key={item.id}
                  className={`grid gap-2 px-4 py-3 md:grid-cols-[8.75rem_minmax(0,1.35fr)_5.75rem_6.75rem_minmax(0,3.05fr)_1rem] ${
                    item.paid ? "bg-transparent" : "bg-white/[0.02]"
                  }`}
                >
                  <div>
                    <DropdownSelect
                      value={categories.includes(item.category) ? item.category : "__custom__"}
                      options={[
                        ...categories.map((category) => ({ value: category, label: category })),
                        ...(categories.includes(item.category)
                          ? []
                          : [{ value: "__custom__", label: item.category }]),
                      ]}
                      className="h-7 w-full rounded-[var(--radius-surface)] border border-border bg-panel px-2.5 text-body-sm text-white/72 outline-none focus:border-[var(--accent-hex)]"
                      optionClassName="text-body-sm"
                      onChange={(nextValue) => {
                        if (nextValue === "__custom__") {
                          return;
                        }
                        updateItem(item.id, "category", nextValue);
                      }}
                    />
                  </div>
                  <div>
                    <Input
                      value={item.title}
                      className="!h-7 py-0 text-body-sm text-white/72"
                      style={{ height: "1.75rem", minHeight: "1.75rem", maxHeight: "1.75rem" }}
                      onChange={(event) => updateItem(item.id, "title", event.target.value)}
                    />
                  </div>
                  <div>
                    <StatusPill
                      paid={item.paid}
                      onToggle={() => updateItem(item.id, "paid", !item.paid)}
                    />
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-body-sm text-muted">
                      €
                    </span>
                    <Input
                      value={item.amount}
                      inputMode="decimal"
                      className="!h-7 py-0 pl-6 text-body-sm text-white/72"
                      style={{ height: "1.75rem", minHeight: "1.75rem", maxHeight: "1.75rem" }}
                      onChange={(event) =>
                        updateItem(item.id, "amount", formatNumberInput(event.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Input
                      value={item.notes}
                      placeholder="Optional notes"
                      className="!h-7 py-0 text-body-sm text-white/72"
                      style={{ height: "1.75rem", minHeight: "1.75rem", maxHeight: "1.75rem" }}
                      onChange={(event) => updateItem(item.id, "notes", event.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      aria-label="Delete cost"
                      className="text-body-lg leading-none text-[var(--accent-hex)] transition-opacity hover:opacity-80"
                      onClick={() => deleteItem(item.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal ? (
        <AddExpenseModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onConfirm={handleAddCost}
        />
      ) : null}

      {showAddCategoryModal ? (
        <PromptDialog
          title="New Cost Category"
          label="Category Name"
          placeholder="Enter category name"
          value={newCategoryName}
          confirmLabel="Add Category"
          hideClose
          hideLabel
          panelClassName="max-w-md px-5 pt-3 pb-2"
          fieldClassName="mt-2.5"
          actionsClassName="mt-2.5 -mr-4"
          titleColor="#FFFFFF"
          cancelButtonClassName="text-muted"
          onChange={setNewCategoryName}
          onClose={() => {
            setShowAddCategoryModal(false);
            setNewCategoryName("");
          }}
          onConfirm={handleAddCategory}
        />
      ) : null}
    </section>
  );
}

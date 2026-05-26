"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicTopNav } from "@/components/layout/public-top-nav";
import { Button } from "@/components/ui/button";
import { isApiErrorPayload } from "@/lib/http/contracts";
import type { TicketCheckoutStatusResult } from "@/types/checkout";

type TicketCheckoutReturnPageProps = {
  orderId?: string;
  stripeCheckoutSessionId?: string;
  variant: "success" | "cancel";
};

type CheckoutStatusState =
  | {
      loading: true;
      error: null;
      result: null;
    }
  | {
      loading: false;
      error: string | null;
      result: TicketCheckoutStatusResult | null;
    };

function buildCheckoutStatusUrl(params: {
  orderId?: string;
  stripeCheckoutSessionId?: string;
}) {
  const url = new URL("/api/store/payments/checkout-status", window.location.origin);

  if (params.orderId) {
    url.searchParams.set("orderId", params.orderId);
  }

  if (params.stripeCheckoutSessionId) {
    url.searchParams.set("session_id", params.stripeCheckoutSessionId);
  }

  return url.toString();
}

function getDisplayCopy(params: {
  variant: "success" | "cancel";
  state: "processing" | "paid" | "failed";
}) {
  if (params.state === "paid") {
    return {
      eyebrow: "Payment confirmed",
      title: "Your tickets are ready.",
      body: "Payment has been confirmed and your order is now reflected in KUSPACE.",
    };
  }

  if (params.state === "processing") {
    return {
      eyebrow: "Payment processing",
      title: "We are still confirming your order.",
      body:
        "Stripe has returned you to KUSPACE, but ticket fulfillment still waits for backend confirmation. This page refreshes automatically.",
    };
  }

  return params.variant === "cancel"
    ? {
        eyebrow: "Checkout canceled",
        title: "Your payment was not completed.",
        body:
          "No tickets were fulfilled from this redirect. You can return to the event and start checkout again when you are ready.",
      }
    : {
        eyebrow: "Payment incomplete",
        title: "We could not confirm this payment.",
        body:
          "This redirect is display-only, so KUSPACE did not fulfill anything from the browser return. Please retry checkout if needed.",
      };
}

export function TicketCheckoutReturnPage(props: TicketCheckoutReturnPageProps) {
  const [status, setStatus] = useState<CheckoutStatusState>({
    loading: true,
    error: null,
    result: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch(
          buildCheckoutStatusUrl({
            orderId: props.orderId,
            stripeCheckoutSessionId: props.stripeCheckoutSessionId,
          }),
          {
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const message = isApiErrorPayload(body)
            ? body.error.message
            : "We could not load the latest payment status.";

          if (!cancelled) {
            setStatus({
              loading: false,
              error: message,
              result: null,
            });
          }

          return;
        }

        if (!cancelled) {
          setStatus({
            loading: false,
            error: null,
            result: body as TicketCheckoutStatusResult,
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({
            loading: false,
            error: "We could not load the latest payment status.",
            result: null,
          });
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [props.orderId, props.stripeCheckoutSessionId]);

  useEffect(() => {
    if (status.loading || status.error || status.result?.checkout.state !== "processing") {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          buildCheckoutStatusUrl({
            orderId: props.orderId,
            stripeCheckoutSessionId: props.stripeCheckoutSessionId,
          }),
          {
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          return;
        }

        setStatus({
          loading: false,
          error: null,
          result: body as TicketCheckoutStatusResult,
        });
      } catch {
        // Keep the most recent status rendered if a poll fails.
      }
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [props.orderId, props.stripeCheckoutSessionId, status]);

  const displayState = status.result?.checkout.state ?? (status.loading ? "processing" : "failed");
  const copy = getDisplayCopy({
    variant: props.variant,
    state: displayState,
  });

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicTopNav title="Nightlife Ops System" subtitle="Clubs, Brands, Collectives" />

      <main className="px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-[var(--radius-surface)] border border-border bg-panel px-5 py-6 md:px-8 md:py-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p
                  className="text-body-sm uppercase tracking-[0.16em]"
                  style={{ color: "var(--accent-hex)", fontFamily: "var(--font-space-grotesk)" }}
                >
                  {copy.eyebrow}
                </p>
                <h1 className="text-heading text-fg">{copy.title}</h1>
                <p className="max-w-2xl text-body leading-7 text-muted">{copy.body}</p>
              </div>

              {status.error ? (
                <div className="rounded-[var(--radius-button-tag)] border border-white/10 bg-white/5 px-4 py-3 text-body-sm text-muted">
                  {status.error}
                </div>
              ) : null}

              {status.result ? (
                <div className="grid gap-3 rounded-[var(--radius-button-tag)] border border-white/10 bg-white/5 px-4 py-4 text-body-sm text-muted md:grid-cols-2">
                  <div>
                    <p className="uppercase tracking-[0.12em] text-white/55">Order</p>
                    <p className="mt-1 text-fg">{status.result.order.id}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.12em] text-white/55">Order status</p>
                    <p className="mt-1 text-fg">{status.result.order.status}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.12em] text-white/55">Checkout session</p>
                    <p className="mt-1 text-fg">
                      {status.result.checkout.stripeCheckoutSessionId ?? "Unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.12em] text-white/55">Payment intent</p>
                    <p className="mt-1 text-fg">
                      {status.result.checkout.stripePaymentIntentId ?? "Pending"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Link href="/cons/tickets">
                  <Button type="button">View tickets</Button>
                </Link>
                <Link href="/">
                  <Button type="button" variant="ghost">
                    Browse events
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

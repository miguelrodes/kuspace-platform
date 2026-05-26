import { TicketCheckoutReturnPage } from "@/components/tickets/ticket-checkout-return-page";

type CancelPageProps = {
  searchParams: Promise<{
    orderId?: string;
    session_id?: string;
  }>;
};

export default async function TicketCheckoutCancelPage(props: CancelPageProps) {
  const searchParams = await props.searchParams;

  return (
    <TicketCheckoutReturnPage
      orderId={searchParams.orderId}
      stripeCheckoutSessionId={searchParams.session_id}
      variant="cancel"
    />
  );
}

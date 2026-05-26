import { TicketCheckoutReturnPage } from "@/components/tickets/ticket-checkout-return-page";

type SuccessPageProps = {
  searchParams: Promise<{
    orderId?: string;
    session_id?: string;
  }>;
};

export default async function TicketCheckoutSuccessPage(props: SuccessPageProps) {
  const searchParams = await props.searchParams;

  return (
    <TicketCheckoutReturnPage
      orderId={searchParams.orderId}
      stripeCheckoutSessionId={searchParams.session_id}
      variant="success"
    />
  );
}

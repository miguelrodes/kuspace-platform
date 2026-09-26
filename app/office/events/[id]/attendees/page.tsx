import Link from "next/link";
import { OfficeShell } from "@/components/layout/office-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireOfficeRecruiterNavigation } from "@/lib/auth/office-navigation";
import { getCurrentAppActorService } from "@/lib/services/auth-actor-service";
import { getOwnedEventAttendeeReportService } from "@/lib/services/attendee-service";
import { formatFullEventDate } from "@/lib/utils/date";

type EventAttendeesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPaymentState(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCheckedIn(value: boolean) {
  return value ? "Checked in" : "Pending";
}

export default async function EventAttendeesPage({
  params,
}: EventAttendeesPageProps) {
  const actor = await getCurrentAppActorService();
  requireOfficeRecruiterNavigation(actor);

  const { id } = await params;
  const report = await getOwnedEventAttendeeReportService(id);

  return (
    <OfficeShell
      eyebrow="Event Operations"
      title={`${report.event.title} Attendees`}
      description={`DB-backed attendee and ticket sales view for ${report.event.venue} on ${formatFullEventDate(report.event.date)}.`}
      headerActions={(
        <Link href={`/office/event-editor/${id}`}>
          <Button type="button" variant="subtle">
            Back to editor
          </Button>
        </Link>
      )}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="space-y-1">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Paid attendees</p>
          <p className="text-title text-fg">{report.summary.totalPaidAttendees}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Tickets sold</p>
          <p className="text-title text-fg">{report.summary.ticketsSold}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Revenue estimate</p>
          <p className="text-title text-fg">{formatCurrency(report.summary.revenueEstimate)}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Checkout revenue</p>
          <p className="text-title text-fg">{formatCurrency(report.summary.checkoutRevenueTotal)}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Door revenue</p>
          <p className="text-title text-fg">{formatCurrency(report.summary.doorTicketRevenue)}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-body-sm uppercase tracking-widerish text-muted">Remaining inventory</p>
          <p className="text-title text-fg">{report.summary.remainingInventory}</p>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-subheading text-fg">Paid attendees</h2>
          <p className="text-body-sm text-muted">
            Payment state and check-in status are resolved from backend-owned access assignments and paid ticket orders.
          </p>
        </div>

        {report.attendees.length === 0 ? (
          <Card>
            <p className="text-body text-muted">
              No paid attendees yet for this event.
            </p>
          </Card>
        ) : (
          <TableWrapper>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Attendee</TH>
                <TH>Username</TH>
                <TH>Section</TH>
                <TH>Phase</TH>
                <TH>Qty</TH>
                <TH>Payment</TH>
                <TH>Access group</TH>
                <TH>Check-in</TH>
                <TH>Total</TH>
              </TR>
            </THead>
            <TBody>
              {report.attendees.map((attendee) => (
                <TR key={`${attendee.orderId}:${attendee.ticketPhaseId}`}>
                  <TD>{attendee.attendeeName}</TD>
                  <TD>@{attendee.attendeeUsername}</TD>
                  <TD>{attendee.ticketSectionName}</TD>
                  <TD>{attendee.ticketPhaseName}</TD>
                  <TD>{attendee.quantity}</TD>
                  <TD>{formatPaymentState(attendee.paymentState)}</TD>
                  <TD>{attendee.accessGroupName}</TD>
                  <TD>{formatCheckedIn(attendee.checkedIn)}</TD>
                  <TD>{formatCurrency(attendee.totalPrice)}</TD>
                </TR>
              ))}
            </TBody>
          </TableWrapper>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-subheading text-fg">Sales summary</h2>
          <p className="text-body-sm text-muted">
            Current sold counts and remaining inventory by section and phase.
          </p>
        </div>

        <TableWrapper>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Section</TH>
              <TH>Phase</TH>
              <TH>Sold</TH>
              <TH>Remaining</TH>
              <TH>Revenue</TH>
            </TR>
          </THead>
          <TBody>
            {report.salesSummary.map((row) => (
              <TR key={`${row.ticketSectionId}:${row.ticketPhaseId}`}>
                <TD>{row.ticketSectionName}</TD>
                <TD>{row.ticketPhaseName}</TD>
                <TD>{row.ticketsSold}</TD>
                <TD>{row.remainingInventory}</TD>
                <TD>{formatCurrency(row.grossRevenue)}</TD>
              </TR>
            ))}
          </TBody>
        </TableWrapper>
      </section>
    </OfficeShell>
  );
}

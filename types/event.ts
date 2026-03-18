export type EventStatus = "draft" | "upcoming" | "live" | "past" | "cancelled";

// Recruiter event editor tab state.
export type EditorTab =
  | "cover"
  | "lineup"
  | "timetable"
  | "guestlist"
  | "budget"
  | "tickets";

export type EventTimeRange = {
  start?: string;
  end?: string;
};

export type EventType = "room" | "terrace" | "festival" | "warehouse";

export type EventCoverSection = {
  title: string;
  description?: string;
  shortDescription?: string;
  date: string;
  time?: EventTimeRange;
  imageUrl: string;
  imageAlt: string;
  location: string;
  venue: string;
  capacityTarget: number;
  genres: string[];
  type: EventType;
  roomSize: number;
  numberOfRooms?: number;
};

export type LineupEntryKind =
  | "main"
  | "opener"
  | "special_guest"
  | "resident";

export type LineupEntry = {
  id: string;
  name: string;
  kind?: LineupEntryKind;
};

export type EventLineupSection = {
  entries: LineupEntry[];
};

export type TimetableRow = {
  id: string;
  title: string;
  lineupEntryId?: string;
  room?: string;
  notes?: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
};

export type EventTimetableSection = {
  startTime?: string;
  endTime?: string;
  rows: TimetableRow[];
};

export type GuestlistGroup = {
  id: string;
  name: string;
};

export type GuestlistEntrySource = "user" | "manual";

export type GuestlistEntry =
  | {
      id: string;
      source: "user";
      groupId: string;
      userId: string;
      checkedIn: boolean;
    }
  | {
      id: string;
      source: "manual";
      groupId: string;
      name: string;
      checkedIn: boolean;
    };

export type EventGuestlistSummary = {
  ticketsSold?: number;
  manualGuests?: number;
  totalAttending?: number;
};

export type EventGuestlistSection = {
  groups: GuestlistGroup[];
  entries: GuestlistEntry[];
  summary?: EventGuestlistSummary;
};

export type BudgetItem = {
  id: string;
  category: string;
  title: string;
  amount: number;
  paid: boolean;
  notes?: string;
};

export type EventBudgetSection = {
  totalBudget: number;
  items: BudgetItem[];
  // UI totals such as paid/unpaid/remaining should be derived from items later.
};

export type TicketTierVisibility = "public" | "hidden";

export type TicketTierStatus = "live" | "upcoming" | "sold_out";

export type TicketTier = {
  id: string;
  name: string;
  price: number;
  quantityAvailable: number;
  quantitySold?: number;
  visibility: TicketTierVisibility;
  status: TicketTierStatus;
  sortOrder: number;
  releaseAfterTierId?: string;
};

export type EventTicketsSection = {
  tiers: TicketTier[];
};

export interface Event {
  id: string;
  slug: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  recruiterProfileId: string;

  cover: EventCoverSection;
  lineup: EventLineupSection;
  timetable: EventTimetableSection;
  guestlist: EventGuestlistSection;
  budget: EventBudgetSection;
  tickets: EventTicketsSection;
}

export type EventSummaryCover = Pick<
  EventCoverSection,
  "imageUrl" | "imageAlt" | "title" | "date" | "location"
>;

export type PublicEventDetails = Pick<
  EventCoverSection,
  | "title"
  | "shortDescription"
  | "description"
  | "genres"
  | "venue"
  | "date"
  | "time"
  | "location"
  | "imageUrl"
  | "imageAlt"
>;

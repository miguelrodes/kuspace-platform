export type EventStatus = "draft" | "upcoming" | "live" | "past" | "cancelled";
export type AdmissionMode = "public" | "curated";

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
export type EventDisplayMode = "event" | "room";

export type ArtistProfile = {
  id: string;
  name: string;
  contact?: string;
  notes?: string;
  instagram?: string;
  residentAdvisor?: string;
  website?: string;
};

export type EventCoverSection = {
  title: string;
  description?: string;
  shortDescription?: string;
  genreDisplayMode?: EventDisplayMode;
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
  rooms?: Array<{
    id: string;
    name: string;
    capacity: number;
    genres?: string[];
  }>;
};

export type LineupEntryKind =
  | "main"
  | "opener"
  | "special_guest"
  | "resident";

export type LineupEntry = {
  id: string;
  artistId: string;
  name: string;
  kind?: LineupEntryKind;
  roomId?: string;
  roomIds?: string[];
};

export type EventLineupSection = {
  displayMode?: EventDisplayMode;
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

export type AccessGroup = {
  id: string;
  name: string;
};

export type EventAccessAssignmentSource = "purchase" | "manual" | "approval";
export type EventAccessPaymentState =
  | "not_required"
  | "pending"
  | "paid"
  | "waived";
export type EventApplicationStatus = "pending" | "accepted" | "denied";

export type EventAccessAssignment = {
  eventId: string;
  userId: string;
  accessGroupId: string;
  source: EventAccessAssignmentSource;
  paymentState: EventAccessPaymentState;
  checkedIn: boolean;
  assignedAt?: string;
  assignedBy?: string;
  notes?: string;
};

export type EventApplication = {
  eventId: string;
  userId: string;
  status: EventApplicationStatus;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  accessGroupId?: string;
  notes?: string;
};

export type GuestlistEntrySource = "user" | "manual";

export type GuestlistEntry =
  | {
      id: string;
      source: "user";
      accessGroupId: string;
      userId: string;
      checkedIn: boolean;
      createdAt?: string;
    }
  | {
      id: string;
      source: "manual";
      accessGroupId: string;
      firstName: string;
      lastName: string;
      userId?: string;
      checkedIn: boolean;
      createdAt?: string;
      notes?: string;
    };

export type EventGuestlistSummary = {
  ticketsSold?: number;
  manualGuests?: number;
  totalAttending?: number;
};

export type EventGuestlistSection = {
  accessGroups: AccessGroup[];
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
export type TicketSectionVisibility = "public" | "hidden" | "restricted";

export type TicketTierStatus = "live" | "upcoming" | "sold_out";
export type TicketReleaseMode = "manual" | "scheduled" | "after_previous_sold_out";

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

export type TicketSection = {
  id: string;
  name: string;
  visibility: TicketSectionVisibility;
  accessGroupId: string;
  allowedGroupIds: string[];
  phases: Array<
    TicketTier & {
      salesStart?: string;
      salesEnd?: string;
      releaseMode?: TicketReleaseMode;
    }
  >;
};

export type EventTicketsSection = {
  tiers: TicketTier[];
  sections?: TicketSection[];
};

export type EventLabel = {
  id: string;
  name: string;
  profileSlug?: string;
  avatarImageUrl?: string;
};

export interface Event {
  id: string;
  slug: string;
  status: EventStatus;
  admissionMode: AdmissionMode;
  createdAt: string;
  updatedAt: string;
  // Canonical event owner / editor.
  recruiterProfileId: string;

  cover: EventCoverSection;
  lineup: EventLineupSection;
  timetable: EventTimetableSection;
  guestlist: EventGuestlistSection;
  accessAssignments: EventAccessAssignment[];
  applications: EventApplication[];
  budget: EventBudgetSection;
  tickets: EventTicketsSection;
  // Attached event brands / labels. Kept separate from recruiterProfileId
  // even when the owner recruiter is also the only label for MVP.
  labels?: EventLabel[];
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

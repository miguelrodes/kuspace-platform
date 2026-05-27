import { z } from "zod";

const trimmedStringSchema = z.string().trim();
const nonEmptyStringSchema = z.string().trim().min(1);
const optionalStringSchema = z.string().trim().optional();
const idSchema = nonEmptyStringSchema;
const dateOnlyStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(""));
const isoDateTimeSchema = z.string().datetime({ offset: true }).or(z.literal(""));
const finiteNumberSchema = z.number().finite();
const nonNegativeNumberSchema = z.number().finite().nonnegative();
const positiveIntSchema = z.number().int().positive();
const nonNegativeIntSchema = z.number().int().nonnegative();

export const eventStatusSchema = z.enum(["draft", "upcoming", "live", "past", "cancelled"]);
export const admissionModeSchema = z.enum(["public", "curated"]);
export const recruiterTypeSchema = z.enum(["nightclub", "label"]);
export const eventDisplayModeSchema = z.enum(["event", "room"]);
export const eventTypeSchema = z.enum(["room", "terrace", "festival", "warehouse"]);
export const lineupEntryKindSchema = z.enum(["main", "opener", "special_guest", "resident"]);
export const eventAccessAssignmentSourceSchema = z.enum(["purchase", "manual", "approval"]);
export const eventAccessPaymentStateSchema = z.enum(["not_required", "pending", "paid", "waived"]);
export const eventApplicationStatusSchema = z.enum(["pending", "accepted", "denied"]);
export const guestlistEntrySourceSchema = z.enum(["user", "manual"]);
export const ticketTierVisibilitySchema = z.enum(["public", "hidden"]);
export const ticketSectionVisibilitySchema = z.enum(["public", "hidden", "restricted"]);
export const ticketTierStatusSchema = z.enum(["live", "upcoming", "sold_out"]);
export const ticketReleaseModeSchema = z.enum(["manual", "scheduled", "after_previous_sold_out"]);
export const consumerTicketStatusSchema = z.enum(["active", "inactive", "scanned"]);
export const checkoutProviderSchema = z.enum(["internal", "stripe"]);

export const accessGroupSchema = z.object({
  id: idSchema,
  name: nonEmptyStringSchema,
});

export const eventLabelSchema = z.object({
  id: idSchema,
  name: nonEmptyStringSchema,
  profileSlug: optionalStringSchema,
  avatarImageUrl: optionalStringSchema,
});

export const budgetItemSchema = z.object({
  id: idSchema,
  category: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  amount: finiteNumberSchema,
  paid: z.boolean(),
  notes: optionalStringSchema,
});

export const lineupEntrySchema = z.object({
  id: idSchema,
  artistId: idSchema,
  name: nonEmptyStringSchema,
  kind: lineupEntryKindSchema.optional(),
  roomId: optionalStringSchema,
  roomIds: z.array(z.string()).optional(),
});

export const timetableRowSchema = z.object({
  id: idSchema,
  title: nonEmptyStringSchema,
  lineupEntryId: optionalStringSchema,
  room: optionalStringSchema,
  notes: optionalStringSchema,
  startTime: nonEmptyStringSchema,
  endTime: nonEmptyStringSchema,
  sortOrder: z.number().int(),
});

const lineupEntryMutationValueSchema = z.object({
  id: optionalStringSchema,
  artistId: idSchema,
  name: nonEmptyStringSchema,
  kind: lineupEntryKindSchema.optional(),
  roomId: optionalStringSchema,
  roomIds: z.array(nonEmptyStringSchema).optional(),
});

const timetableRowMutationValueSchema = z.object({
  id: optionalStringSchema,
  title: nonEmptyStringSchema,
  lineupEntryId: optionalStringSchema,
  room: optionalStringSchema,
  notes: optionalStringSchema,
  startTime: nonEmptyStringSchema,
  endTime: nonEmptyStringSchema,
  sortOrder: z.number().int().optional(),
});

const guestlistUserEntryMutationValueSchema = z.object({
  id: optionalStringSchema,
  source: z.literal("user"),
  accessGroupId: idSchema,
  userId: idSchema,
  checkedIn: z.boolean().optional(),
  createdAt: optionalStringSchema,
});

const guestlistManualEntryMutationValueSchema = z.object({
  id: optionalStringSchema,
  source: z.literal("manual"),
  accessGroupId: idSchema,
  firstName: nonEmptyStringSchema,
  lastName: nonEmptyStringSchema,
  userId: optionalStringSchema,
  checkedIn: z.boolean().optional(),
  createdAt: optionalStringSchema,
  notes: optionalStringSchema,
});

const budgetItemMutationValueSchema = z.object({
  id: optionalStringSchema,
  category: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
  amount: finiteNumberSchema,
  paid: z.boolean(),
  notes: optionalStringSchema,
});

const ticketPhaseMutationValueSchema = z.object({
  id: optionalStringSchema,
  name: nonEmptyStringSchema,
  price: finiteNumberSchema,
  quantityAvailable: nonNegativeIntSchema,
  quantitySold: nonNegativeIntSchema.optional(),
  visibility: ticketTierVisibilitySchema,
  status: ticketTierStatusSchema,
  sortOrder: z.number().int().optional(),
  releaseAfterTierId: optionalStringSchema,
  salesStart: optionalStringSchema,
  salesEnd: optionalStringSchema,
  releaseMode: ticketReleaseModeSchema.optional(),
});

const ticketSectionMutationValueSchema = z.object({
  id: optionalStringSchema,
  name: nonEmptyStringSchema,
  visibility: ticketSectionVisibilitySchema,
  accessGroupId: idSchema,
  allowedGroupIds: z.array(nonEmptyStringSchema),
  phases: z.array(ticketPhaseMutationValueSchema).optional(),
});

export const guestlistUserEntrySchema = z.object({
  id: idSchema,
  source: z.literal("user"),
  accessGroupId: idSchema,
  userId: idSchema,
  checkedIn: z.boolean(),
  createdAt: optionalStringSchema,
});

export const guestlistManualEntrySchema = z.object({
  id: idSchema,
  source: z.literal("manual"),
  accessGroupId: idSchema,
  firstName: nonEmptyStringSchema,
  lastName: nonEmptyStringSchema,
  userId: optionalStringSchema,
  checkedIn: z.boolean(),
  createdAt: optionalStringSchema,
  notes: optionalStringSchema,
});

export const guestlistEntrySchema = z.union([
  guestlistUserEntrySchema,
  guestlistManualEntrySchema,
]);

export const guestlistEntryMutationValueSchema = z.union([
  guestlistUserEntryMutationValueSchema,
  guestlistManualEntryMutationValueSchema,
]);

export const eventAccessAssignmentSchema = z.object({
  eventId: idSchema,
  userId: idSchema,
  accessGroupId: idSchema,
  source: eventAccessAssignmentSourceSchema,
  paymentState: eventAccessPaymentStateSchema,
  checkedIn: z.boolean(),
  assignedAt: optionalStringSchema,
  assignedBy: optionalStringSchema,
  notes: optionalStringSchema,
});

export const eventApplicationSchema = z.object({
  eventId: idSchema,
  userId: idSchema,
  status: eventApplicationStatusSchema,
  appliedAt: isoDateTimeSchema,
  reviewedAt: optionalStringSchema,
  reviewedBy: optionalStringSchema,
  accessGroupId: optionalStringSchema,
  notes: optionalStringSchema,
});

export const ticketPhaseSchema = z.object({
  id: idSchema,
  name: nonEmptyStringSchema,
  price: finiteNumberSchema,
  quantityAvailable: nonNegativeIntSchema,
  quantitySold: nonNegativeIntSchema.optional(),
  visibility: ticketTierVisibilitySchema,
  status: ticketTierStatusSchema,
  sortOrder: z.number().int(),
  releaseAfterTierId: optionalStringSchema,
  salesStart: optionalStringSchema,
  salesEnd: optionalStringSchema,
  releaseMode: ticketReleaseModeSchema.optional(),
});

export const ticketSectionSchema = z.object({
  id: idSchema,
  name: nonEmptyStringSchema,
  visibility: ticketSectionVisibilitySchema,
  accessGroupId: idSchema,
  allowedGroupIds: z.array(z.string()),
  phases: z.array(ticketPhaseSchema),
});

export const eventCoverRoomSchema = z.object({
  id: idSchema,
  name: nonEmptyStringSchema,
  capacity: nonNegativeIntSchema,
  genres: z.array(z.string()).optional(),
});

export const eventCoverSchema = z.object({
  title: nonEmptyStringSchema,
  description: optionalStringSchema,
  shortDescription: optionalStringSchema,
  genreDisplayMode: eventDisplayModeSchema.optional(),
  date: dateOnlyStringSchema,
  time: z
    .object({
      start: optionalStringSchema,
      end: optionalStringSchema,
    })
    .optional(),
  imageUrl: nonEmptyStringSchema,
  imageAlt: nonEmptyStringSchema,
  location: nonEmptyStringSchema,
  venue: nonEmptyStringSchema,
  capacityTarget: nonNegativeIntSchema,
  genres: z.array(z.string()),
  type: eventTypeSchema,
  roomSize: nonNegativeIntSchema,
  numberOfRooms: nonNegativeIntSchema.optional(),
  rooms: z.array(eventCoverRoomSchema).optional(),
});

export const eventLineupSchema = z.object({
  displayMode: eventDisplayModeSchema.optional(),
  entries: z.array(lineupEntrySchema),
});

export const eventTimetableSchema = z.object({
  startTime: optionalStringSchema,
  endTime: optionalStringSchema,
  rows: z.array(timetableRowSchema),
});

export const eventGuestlistSummarySchema = z.object({
  ticketsSold: nonNegativeIntSchema.optional(),
  manualGuests: nonNegativeIntSchema.optional(),
  totalAttending: nonNegativeIntSchema.optional(),
});

export const eventGuestlistSchema = z.object({
  accessGroups: z.array(accessGroupSchema),
  entries: z.array(guestlistEntrySchema),
  summary: eventGuestlistSummarySchema.optional(),
});

export const eventBudgetSchema = z.object({
  totalBudget: finiteNumberSchema,
  doorTicketRevenue: nonNegativeNumberSchema,
  items: z.array(budgetItemSchema),
});

export const eventTicketsSchema = z.object({
  tiers: z.array(ticketPhaseSchema),
  sections: z.array(ticketSectionSchema).optional(),
});

export const eventCoverOverrideSchema = z.object({
  title: optionalStringSchema,
  description: optionalStringSchema,
  shortDescription: optionalStringSchema,
  genreDisplayMode: eventDisplayModeSchema.optional(),
  date: dateOnlyStringSchema.optional(),
  time: z
    .object({
      start: optionalStringSchema,
      end: optionalStringSchema,
    })
    .optional(),
  imageUrl: optionalStringSchema,
  imageAlt: optionalStringSchema,
  location: optionalStringSchema,
  venue: optionalStringSchema,
  capacityTarget: nonNegativeIntSchema.optional(),
  genres: z.array(z.string()).optional(),
  type: eventTypeSchema.optional(),
  roomSize: nonNegativeIntSchema.optional(),
  numberOfRooms: nonNegativeIntSchema.optional(),
  rooms: z.array(eventCoverRoomSchema).optional(),
});

export const eventLineupOverrideSchema = z.object({
  displayMode: eventDisplayModeSchema.optional(),
  entries: z.array(lineupEntrySchema).optional(),
});

export const eventTimetableOverrideSchema = z.object({
  startTime: optionalStringSchema,
  endTime: optionalStringSchema,
  rows: z.array(timetableRowSchema).optional(),
});

export const eventGuestlistOverrideSchema = z.object({
  accessGroups: z.array(accessGroupSchema).optional(),
  entries: z.array(guestlistEntrySchema).optional(),
  summary: eventGuestlistSummarySchema.optional(),
});

export const eventBudgetOverrideSchema = z.object({
  totalBudget: finiteNumberSchema.optional(),
  doorTicketRevenue: nonNegativeNumberSchema.optional(),
  items: z.array(budgetItemSchema).optional(),
});

export const eventTicketsOverrideSchema = z.object({
  tiers: z.array(ticketPhaseSchema).optional(),
  sections: z.array(ticketSectionSchema).optional(),
});

export const eventSchema = z.object({
  id: idSchema,
  slug: nonEmptyStringSchema,
  status: eventStatusSchema,
  admissionMode: admissionModeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  organizationId: idSchema.optional(),
  recruiterProfileId: idSchema,
  cover: eventCoverSchema,
  lineup: eventLineupSchema,
  timetable: eventTimetableSchema,
  guestlist: eventGuestlistSchema,
  accessAssignments: z.array(eventAccessAssignmentSchema),
  applications: z.array(eventApplicationSchema),
  budget: eventBudgetSchema,
  tickets: eventTicketsSchema,
  labels: z.array(eventLabelSchema).optional(),
});

export const eventCreateSchema = eventSchema;
export const eventUpdateSchema = eventSchema;

export const createDraftEventRequestSchema = z.object({
  slug: optionalStringSchema,
  status: eventStatusSchema.optional(),
  admissionMode: admissionModeSchema.optional(),
  cover: eventCoverOverrideSchema.optional(),
  lineup: eventLineupOverrideSchema.optional(),
  timetable: eventTimetableOverrideSchema.optional(),
  guestlist: eventGuestlistOverrideSchema.optional(),
  accessAssignments: z.array(eventAccessAssignmentSchema).optional(),
  applications: z.array(eventApplicationSchema).optional(),
  budget: eventBudgetOverrideSchema.optional(),
  tickets: eventTicketsOverrideSchema.optional(),
  labels: z.array(eventLabelSchema).optional(),
});

export const coverUpdateSchema = z.object({
  slug: optionalStringSchema,
  admissionMode: admissionModeSchema.optional(),
  cover: eventCoverSchema,
});

export const lineupUpdateSchema = z.object({
  lineup: eventLineupSchema,
});

export const timetableUpdateSchema = z.object({
  timetable: eventTimetableSchema,
});

export const guestlistMutationSchema = z.object({
  guestlist: eventGuestlistSchema,
});

export const budgetUpdateSchema = z.object({
  budget: eventBudgetSchema,
});

export const ticketsUpdateSchema = z.object({
  tickets: eventTicketsSchema,
});

export const labelsUpdateSchema = z.object({
  labels: z.array(eventLabelSchema).optional(),
});

export const ticketSectionMutationSchema = z.object({
  section: ticketSectionMutationValueSchema,
});

export const ticketPhaseMutationSchema = z.object({
  phase: ticketPhaseMutationValueSchema,
});

export const budgetItemMutationSchema = z.object({
  item: budgetItemMutationValueSchema,
});

export const consumerTicketWalletEntrySchema = z.object({
  eventSlug: nonEmptyStringSchema,
  quantity: positiveIntSchema,
  accessGroupId: idSchema,
  ticketLabel: optionalStringSchema,
  status: consumerTicketStatusSchema.optional(),
});

export const recruiterProfileSchema = z.object({
  id: idSchema,
  slug: nonEmptyStringSchema,
  recruiterType: recruiterTypeSchema,
  realName: optionalStringSchema,
  displayName: nonEmptyStringSchema,
  media: z.object({
    avatarImageUrl: optionalStringSchema,
    bannerImageUrl: optionalStringSchema,
  }).optional(),
  bio: optionalStringSchema,
  location: z.object({
    displayText: optionalStringSchema,
  }).optional(),
  links: z.object({
    instagram: optionalStringSchema,
    soundcloud: optionalStringSchema,
    spotify: optionalStringSchema,
    residentAdvisor: optionalStringSchema,
    website: optionalStringSchema,
    email: optionalStringSchema,
    mapsLocation: optionalStringSchema,
  }).optional(),
  canFollow: z.boolean().optional(),
  soundProfile: z.object({
    genres: z.array(z.string()),
    roomSize: finiteNumberSchema.optional(),
    roomCount: finiteNumberSchema.optional(),
    rooms: z.array(z.object({
      name: nonEmptyStringSchema,
      capacity: nonNegativeIntSchema,
    })).optional(),
  }).optional(),
  stats: z.object({
    eventsHeld: finiteNumberSchema.optional(),
    citiesActive: finiteNumberSchema.optional(),
    followers: finiteNumberSchema.optional(),
    publicRating: finiteNumberSchema.optional(),
    display: z.object({
      eventsHeld: z.boolean(),
      citiesActive: z.boolean(),
      followers: z.boolean(),
      publicRating: z.boolean(),
    }),
  }).optional(),
  events: z.object({
    upcoming: z.array(eventSchema).optional(),
    past: z.array(eventSchema).optional(),
  }).optional(),
});

export const consumerProfileUpdateSchema = z.object({
  id: idSchema,
  username: nonEmptyStringSchema,
  firstName: nonEmptyStringSchema,
  lastName: nonEmptyStringSchema,
  email: z.string().email(),
  phoneNumber: optionalStringSchema,
  avatarImageUrl: optionalStringSchema,
  city: optionalStringSchema,
  birthdate: optionalStringSchema,
  profileVisibility: z.enum(["public", "private"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  favoriteGenres: z.array(z.string()).optional(),
  savedEventSlugs: z.array(z.string()).optional(),
  upcomingTicketEventSlugs: z.array(z.string()).optional(),
  pastTicketEventSlugs: z.array(z.string()).optional(),
  ticketWalletEntries: z.array(consumerTicketWalletEntrySchema).optional(),
  createdAt: isoDateTimeSchema,
});

export const consumerUserSchema = z.object({
  id: idSchema,
  username: nonEmptyStringSchema,
  firstName: nonEmptyStringSchema,
  lastName: nonEmptyStringSchema,
  email: z.string().email(),
  phoneNumber: optionalStringSchema,
  avatarImageUrl: optionalStringSchema,
  city: optionalStringSchema,
  birthdate: optionalStringSchema,
  profileVisibility: z.enum(["public", "private"]).optional(),
  notificationsEnabled: z.boolean().optional(),
  favoriteGenres: z.array(z.string()).optional(),
  savedEventSlugs: z.array(z.string()).optional(),
  upcomingTicketEventSlugs: z.array(z.string()).optional(),
  pastTicketEventSlugs: z.array(z.string()).optional(),
  ticketWalletEntries: z.array(consumerTicketWalletEntrySchema).optional(),
  createdAt: isoDateTimeSchema,
});

export const idParamsSchema = z.object({
  id: idSchema,
});

export const idAndUserIdParamsSchema = z.object({
  id: idSchema,
  userId: idSchema,
});

export const idAndEntryIdParamsSchema = z.object({
  id: idSchema,
  entryId: idSchema,
});

export const idAndRowIdParamsSchema = z.object({
  id: idSchema,
  rowId: idSchema,
});

export const idAndGuestlistEntryIdParamsSchema = z.object({
  id: idSchema,
  entryId: idSchema,
});

export const idAndItemIdParamsSchema = z.object({
  id: idSchema,
  itemId: idSchema,
});

export const idAndSectionIdParamsSchema = z.object({
  id: idSchema,
  sectionId: idSchema,
});

export const idSectionAndPhaseParamsSchema = z.object({
  id: idSchema,
  sectionId: idSchema,
  phaseId: idSchema,
});

export const idAndSlugParamsSchema = z.object({
  id: idSchema,
  slug: nonEmptyStringSchema,
});

export const lineupEntryMutationSchema = z.object({
  entry: lineupEntryMutationValueSchema,
});

export const timetableRowMutationSchema = z.object({
  row: timetableRowMutationValueSchema,
});

export const guestlistEntryMutationSchema = z.object({
  entry: guestlistEntryMutationValueSchema,
});

export const purchaseTicketSectionSchema = z.object({
  userId: idSchema,
  sectionId: idSchema,
  phaseId: idSchema,
  quantity: positiveIntSchema.optional(),
});

export const purchaseTicketSectionServiceSchema = purchaseTicketSectionSchema.extend({
  eventId: idSchema,
});

export const createCheckoutIntentSchema = z.object({
  sectionId: idSchema,
  phaseId: idSchema,
  quantity: positiveIntSchema.optional(),
});

export const createCheckoutIntentServiceSchema = z.object({
  eventId: idSchema,
  userId: idSchema,
  sectionId: idSchema,
  phaseId: idSchema.optional(),
  quantity: positiveIntSchema.optional(),
  provider: checkoutProviderSchema.optional(),
});

export const checkoutIntentSchema = z.object({
  orderId: idSchema,
  eventId: idSchema,
  userId: idSchema,
  sectionId: idSchema,
  ticketPhaseId: idSchema,
  quantity: positiveIntSchema,
  accessGroupId: idSchema,
  ticketLabel: nonEmptyStringSchema,
  amountTotal: nonNegativeNumberSchema,
  currency: z.literal("EUR"),
  paymentState: eventAccessPaymentStateSchema,
  provider: checkoutProviderSchema,
  providerReference: optionalStringSchema,
});

export const checkoutIntentPaymentTransitionSchema = z.object({
  orderId: idSchema,
  status: z.enum(["paid", "payment_failed", "cancelled", "expired"]),
  stripeConnectedAccountId: optionalStringSchema,
  stripeCheckoutSessionId: optionalStringSchema,
  stripePaymentIntentId: optionalStringSchema,
  occurredAt: isoDateTimeSchema.optional(),
});

export const stripeWebhookMutationSchema = z.object({
  orderId: optionalStringSchema,
  stripeConnectedAccountId: optionalStringSchema,
  stripeCheckoutSessionId: optionalStringSchema,
  stripePaymentIntentId: optionalStringSchema,
  status: z.enum(["paid", "payment_failed", "cancelled", "expired"]),
  occurredAt: isoDateTimeSchema.optional(),
}).refine(
  (value) =>
    Boolean(
      value.orderId ||
      value.stripeCheckoutSessionId ||
      value.stripePaymentIntentId,
    ),
  {
    message: "A ticket order reference is required.",
    path: ["orderId"],
  },
);

export const checkoutStatusQuerySchema = z.object({
  orderId: optionalStringSchema,
  stripeCheckoutSessionId: optionalStringSchema,
}).refine(
  (value) => Boolean(value.orderId || value.stripeCheckoutSessionId),
  {
    message: "A ticket order reference is required.",
    path: ["orderId"],
  },
);

export const applyToCuratedEventSchema = z.object({
  userId: idSchema,
});

export const applyToCuratedEventServiceSchema = applyToCuratedEventSchema.extend({
  eventId: idSchema,
});

export const approveCuratedApplicationSchema = z.object({
  accessGroupId: idSchema,
});

export const approveCuratedApplicationServiceSchema = approveCuratedApplicationSchema.extend({
  eventId: idSchema,
  userId: idSchema,
});

export const denyCuratedApplicationSchema = z.object({}).strict();

export const denyCuratedApplicationServiceSchema = z.object({
  eventId: idSchema,
  userId: idSchema,
});

export const eventStatusTransitionSchema = z.object({
  status: eventStatusSchema,
});

export type EventInput = z.infer<typeof eventSchema>;
export type CreateDraftEventRequestInput = z.infer<typeof createDraftEventRequestSchema>;
export type RecruiterProfileInput = z.infer<typeof recruiterProfileSchema>;
export type ConsumerProfileUpdateInput = z.infer<typeof consumerProfileUpdateSchema>;
export type CheckoutIntentInput = z.infer<typeof checkoutIntentSchema>;

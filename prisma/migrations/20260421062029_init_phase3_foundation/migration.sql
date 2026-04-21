-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'upcoming', 'live', 'past', 'cancelled');

-- CreateEnum
CREATE TYPE "AdmissionMode" AS ENUM ('public', 'curated');

-- CreateEnum
CREATE TYPE "EventDisplayMode" AS ENUM ('event', 'room');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('room', 'terrace', 'festival', 'warehouse');

-- CreateEnum
CREATE TYPE "LineupEntryKind" AS ENUM ('main', 'opener', 'special_guest', 'resident');

-- CreateEnum
CREATE TYPE "EventAccessAssignmentSource" AS ENUM ('purchase', 'manual', 'approval');

-- CreateEnum
CREATE TYPE "EventAccessPaymentState" AS ENUM ('not_required', 'pending', 'paid', 'waived');

-- CreateEnum
CREATE TYPE "EventApplicationStatus" AS ENUM ('pending', 'accepted', 'denied');

-- CreateEnum
CREATE TYPE "GuestlistEntrySource" AS ENUM ('user', 'manual');

-- CreateEnum
CREATE TYPE "TicketTierVisibility" AS ENUM ('public', 'hidden');

-- CreateEnum
CREATE TYPE "TicketSectionVisibility" AS ENUM ('public', 'hidden', 'restricted');

-- CreateEnum
CREATE TYPE "TicketTierStatus" AS ENUM ('live', 'upcoming', 'sold_out');

-- CreateEnum
CREATE TYPE "TicketReleaseMode" AS ENUM ('manual', 'scheduled', 'after_previous_sold_out');

-- CreateEnum
CREATE TYPE "RecruiterType" AS ENUM ('nightclub', 'label');

-- CreateEnum
CREATE TYPE "ConsumerTicketStatus" AS ENUM ('active', 'inactive', 'scanned');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('public', 'private');

-- CreateTable
CREATE TABLE "recruiter_profiles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "recruiterType" "RecruiterType" NOT NULL,
    "realName" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarImageUrl" TEXT,
    "bannerImageUrl" TEXT,
    "bio" TEXT,
    "locationDisplayText" TEXT,
    "canFollow" BOOLEAN,
    "instagram" TEXT,
    "soundcloud" TEXT,
    "spotify" TEXT,
    "residentAdvisor" TEXT,
    "website" TEXT,
    "email" TEXT,
    "mapsLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_profile_stats" (
    "recruiterProfileId" TEXT NOT NULL,
    "eventsHeld" INTEGER,
    "citiesActive" INTEGER,
    "followers" INTEGER,
    "publicRating" DOUBLE PRECISION,
    "displayEventsHeld" BOOLEAN NOT NULL DEFAULT true,
    "displayCitiesActive" BOOLEAN NOT NULL DEFAULT true,
    "displayFollowers" BOOLEAN NOT NULL DEFAULT true,
    "displayPublicRating" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recruiter_profile_stats_pkey" PRIMARY KEY ("recruiterProfileId")
);

-- CreateTable
CREATE TABLE "recruiter_sound_profiles" (
    "id" TEXT NOT NULL,
    "recruiterProfileId" TEXT NOT NULL,
    "roomSize" INTEGER,
    "roomCount" INTEGER,

    CONSTRAINT "recruiter_sound_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_sound_profile_genres" (
    "id" TEXT NOT NULL,
    "recruiterSoundProfileId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "recruiter_sound_profile_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_sound_profile_rooms" (
    "id" TEXT NOT NULL,
    "recruiterSoundProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "recruiter_sound_profile_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "avatarImageUrl" TEXT,
    "city" TEXT,
    "birthdate" TIMESTAMP(3),
    "profileVisibility" "ProfileVisibility",
    "notificationsEnabled" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_user_favorite_genres" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "consumer_user_favorite_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_user_saved_events" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_user_saved_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_user_upcoming_ticket_events" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_user_upcoming_ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_user_past_ticket_events" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_user_past_ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_ticket_wallet_entries" (
    "id" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "accessGroupId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "ticketLabel" TEXT,
    "status" "ConsumerTicketStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_ticket_wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL,
    "admissionMode" "AdmissionMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recruiterProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "genreDisplayMode" "EventDisplayMode",
    "lineupDisplayMode" "EventDisplayMode",
    "date" TIMESTAMP(3) NOT NULL,
    "timeStart" TEXT,
    "timeEnd" TEXT,
    "timetableStartTime" TEXT,
    "timetableEndTime" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "capacityTarget" INTEGER NOT NULL,
    "eventType" "EventType" NOT NULL,
    "roomSize" INTEGER NOT NULL,
    "numberOfRooms" INTEGER,
    "totalBudget" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_genres" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rooms" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientKey" TEXT,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_room_genres" (
    "id" TEXT NOT NULL,
    "eventRoomId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_room_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_lineup_entries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientKey" TEXT,
    "artistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LineupEntryKind",
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_lineup_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_lineup_entry_rooms" (
    "lineupEntryId" TEXT NOT NULL,
    "eventRoomId" TEXT NOT NULL,

    CONSTRAINT "event_lineup_entry_rooms_pkey" PRIMARY KEY ("lineupEntryId","eventRoomId")
);

-- CreateTable
CREATE TABLE "event_timetable_rows" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientKey" TEXT,
    "title" TEXT NOT NULL,
    "lineupEntryId" TEXT,
    "eventRoomId" TEXT,
    "roomName" TEXT,
    "notes" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_timetable_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_access_groups" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientKey" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_access_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_access_assignments" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "accessGroupId" TEXT NOT NULL,
    "source" "EventAccessAssignmentSource" NOT NULL,
    "paymentState" "EventAccessPaymentState" NOT NULL,
    "checkedIn" BOOLEAN NOT NULL,
    "assignedAt" TIMESTAMP(3),
    "assignedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "event_access_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_applications" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerUserId" TEXT NOT NULL,
    "status" "EventApplicationStatus" NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "accessGroupId" TEXT,
    "notes" TEXT,

    CONSTRAINT "event_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_guestlist_entries" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "source" "GuestlistEntrySource" NOT NULL,
    "accessGroupId" TEXT NOT NULL,
    "consumerUserId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "checkedIn" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "event_guestlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_budget_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientKey" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid" BOOLEAN NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_ticket_sections" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clientKey" TEXT,
    "name" TEXT NOT NULL,
    "visibility" "TicketSectionVisibility" NOT NULL,
    "accessGroupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_ticket_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_ticket_section_allowed_groups" (
    "ticketSectionId" TEXT NOT NULL,
    "accessGroupId" TEXT NOT NULL,

    CONSTRAINT "event_ticket_section_allowed_groups_pkey" PRIMARY KEY ("ticketSectionId","accessGroupId")
);

-- CreateTable
CREATE TABLE "event_ticket_tiers" (
    "id" TEXT NOT NULL,
    "ticketSectionId" TEXT NOT NULL,
    "clientKey" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "quantityAvailable" INTEGER NOT NULL,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "visibility" "TicketTierVisibility" NOT NULL,
    "status" "TicketTierStatus" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "salesStart" TIMESTAMP(3),
    "salesEnd" TIMESTAMP(3),
    "releaseMode" "TicketReleaseMode",
    "releaseAfterTierId" TEXT,

    CONSTRAINT "event_ticket_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_labels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profileSlug" TEXT,
    "avatarImageUrl" TEXT,
    "recruiterProfileId" TEXT,

    CONSTRAINT "event_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_label_links" (
    "eventId" TEXT NOT NULL,
    "eventLabelId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "event_label_links_pkey" PRIMARY KEY ("eventId","eventLabelId")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_profiles_slug_key" ON "recruiter_profiles"("slug");

-- CreateIndex
CREATE INDEX "recruiter_profiles_recruiterType_idx" ON "recruiter_profiles"("recruiterType");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_sound_profiles_recruiterProfileId_key" ON "recruiter_sound_profiles"("recruiterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_sound_profile_genres_recruiterSoundProfileId_sort_key" ON "recruiter_sound_profile_genres"("recruiterSoundProfileId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_sound_profile_rooms_recruiterSoundProfileId_sortO_key" ON "recruiter_sound_profile_rooms"("recruiterSoundProfileId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_users_username_key" ON "consumer_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_users_email_key" ON "consumer_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_user_favorite_genres_consumerUserId_sortOrder_key" ON "consumer_user_favorite_genres"("consumerUserId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_user_saved_events_consumerUserId_eventSlug_key" ON "consumer_user_saved_events"("consumerUserId", "eventSlug");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_user_upcoming_ticket_events_consumerUserId_eventSl_key" ON "consumer_user_upcoming_ticket_events"("consumerUserId", "eventSlug");

-- CreateIndex
CREATE UNIQUE INDEX "consumer_user_past_ticket_events_consumerUserId_eventSlug_key" ON "consumer_user_past_ticket_events"("consumerUserId", "eventSlug");

-- CreateIndex
CREATE INDEX "consumer_ticket_wallet_entries_consumerUserId_eventSlug_idx" ON "consumer_ticket_wallet_entries"("consumerUserId", "eventSlug");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_admissionMode_idx" ON "events"("admissionMode");

-- CreateIndex
CREATE INDEX "events_recruiterProfileId_status_idx" ON "events"("recruiterProfileId", "status");

-- CreateIndex
CREATE INDEX "events_admissionMode_status_idx" ON "events"("admissionMode", "status");

-- CreateIndex
CREATE INDEX "events_recruiterProfileId_idx" ON "events"("recruiterProfileId");

-- CreateIndex
CREATE INDEX "events_date_idx" ON "events"("date");

-- CreateIndex
CREATE INDEX "events_slug_status_idx" ON "events"("slug", "status");

-- CreateIndex
CREATE INDEX "event_genres_eventId_idx" ON "event_genres"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_genres_eventId_sortOrder_key" ON "event_genres"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_rooms_eventId_idx" ON "event_rooms"("eventId");

-- CreateIndex
CREATE INDEX "event_rooms_clientKey_idx" ON "event_rooms"("clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "event_rooms_eventId_sortOrder_key" ON "event_rooms"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_room_genres_eventRoomId_idx" ON "event_room_genres"("eventRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "event_room_genres_eventRoomId_sortOrder_key" ON "event_room_genres"("eventRoomId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_lineup_entries_eventId_idx" ON "event_lineup_entries"("eventId");

-- CreateIndex
CREATE INDEX "event_lineup_entries_artistId_idx" ON "event_lineup_entries"("artistId");

-- CreateIndex
CREATE INDEX "event_lineup_entries_clientKey_idx" ON "event_lineup_entries"("clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "event_lineup_entries_eventId_sortOrder_key" ON "event_lineup_entries"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_lineup_entry_rooms_eventRoomId_idx" ON "event_lineup_entry_rooms"("eventRoomId");

-- CreateIndex
CREATE INDEX "event_timetable_rows_eventId_idx" ON "event_timetable_rows"("eventId");

-- CreateIndex
CREATE INDEX "event_timetable_rows_eventRoomId_idx" ON "event_timetable_rows"("eventRoomId");

-- CreateIndex
CREATE INDEX "event_timetable_rows_lineupEntryId_idx" ON "event_timetable_rows"("lineupEntryId");

-- CreateIndex
CREATE INDEX "event_timetable_rows_clientKey_idx" ON "event_timetable_rows"("clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "event_timetable_rows_eventId_sortOrder_key" ON "event_timetable_rows"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_access_groups_eventId_idx" ON "event_access_groups"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_access_groups_eventId_sortOrder_key" ON "event_access_groups"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_access_assignments_eventId_idx" ON "event_access_assignments"("eventId");

-- CreateIndex
CREATE INDEX "event_access_assignments_consumerUserId_idx" ON "event_access_assignments"("consumerUserId");

-- CreateIndex
CREATE INDEX "event_access_assignments_accessGroupId_idx" ON "event_access_assignments"("accessGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "event_access_assignments_eventId_consumerUserId_key" ON "event_access_assignments"("eventId", "consumerUserId");

-- CreateIndex
CREATE INDEX "event_applications_eventId_idx" ON "event_applications"("eventId");

-- CreateIndex
CREATE INDEX "event_applications_consumerUserId_idx" ON "event_applications"("consumerUserId");

-- CreateIndex
CREATE INDEX "event_applications_accessGroupId_idx" ON "event_applications"("accessGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "event_applications_eventId_consumerUserId_key" ON "event_applications"("eventId", "consumerUserId");

-- CreateIndex
CREATE INDEX "event_guestlist_entries_eventId_idx" ON "event_guestlist_entries"("eventId");

-- CreateIndex
CREATE INDEX "event_guestlist_entries_accessGroupId_idx" ON "event_guestlist_entries"("accessGroupId");

-- CreateIndex
CREATE INDEX "event_guestlist_entries_consumerUserId_idx" ON "event_guestlist_entries"("consumerUserId");

-- CreateIndex
CREATE INDEX "event_budget_items_eventId_idx" ON "event_budget_items"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_budget_items_eventId_sortOrder_key" ON "event_budget_items"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_ticket_sections_eventId_idx" ON "event_ticket_sections"("eventId");

-- CreateIndex
CREATE INDEX "event_ticket_sections_accessGroupId_idx" ON "event_ticket_sections"("accessGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "event_ticket_sections_eventId_sortOrder_key" ON "event_ticket_sections"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_ticket_section_allowed_groups_accessGroupId_idx" ON "event_ticket_section_allowed_groups"("accessGroupId");

-- CreateIndex
CREATE INDEX "event_ticket_tiers_ticketSectionId_idx" ON "event_ticket_tiers"("ticketSectionId");

-- CreateIndex
CREATE INDEX "event_ticket_tiers_releaseAfterTierId_idx" ON "event_ticket_tiers"("releaseAfterTierId");

-- CreateIndex
CREATE INDEX "event_ticket_tiers_clientKey_idx" ON "event_ticket_tiers"("clientKey");

-- CreateIndex
CREATE INDEX "event_ticket_tiers_status_idx" ON "event_ticket_tiers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_ticket_tiers_ticketSectionId_sortOrder_key" ON "event_ticket_tiers"("ticketSectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "event_labels_name_idx" ON "event_labels"("name");

-- CreateIndex
CREATE INDEX "event_labels_recruiterProfileId_idx" ON "event_labels"("recruiterProfileId");

-- CreateIndex
CREATE INDEX "event_labels_profileSlug_idx" ON "event_labels"("profileSlug");

-- CreateIndex
CREATE INDEX "event_label_links_eventLabelId_idx" ON "event_label_links"("eventLabelId");

-- CreateIndex
CREATE UNIQUE INDEX "event_label_links_eventId_sortOrder_key" ON "event_label_links"("eventId", "sortOrder");

-- AddForeignKey
ALTER TABLE "recruiter_profile_stats" ADD CONSTRAINT "recruiter_profile_stats_recruiterProfileId_fkey" FOREIGN KEY ("recruiterProfileId") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_sound_profiles" ADD CONSTRAINT "recruiter_sound_profiles_recruiterProfileId_fkey" FOREIGN KEY ("recruiterProfileId") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_sound_profile_genres" ADD CONSTRAINT "recruiter_sound_profile_genres_recruiterSoundProfileId_fkey" FOREIGN KEY ("recruiterSoundProfileId") REFERENCES "recruiter_sound_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_sound_profile_rooms" ADD CONSTRAINT "recruiter_sound_profile_rooms_recruiterSoundProfileId_fkey" FOREIGN KEY ("recruiterSoundProfileId") REFERENCES "recruiter_sound_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_user_favorite_genres" ADD CONSTRAINT "consumer_user_favorite_genres_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_user_saved_events" ADD CONSTRAINT "consumer_user_saved_events_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_user_saved_events" ADD CONSTRAINT "consumer_user_saved_events_eventSlug_fkey" FOREIGN KEY ("eventSlug") REFERENCES "events"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_user_upcoming_ticket_events" ADD CONSTRAINT "consumer_user_upcoming_ticket_events_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_user_upcoming_ticket_events" ADD CONSTRAINT "consumer_user_upcoming_ticket_events_eventSlug_fkey" FOREIGN KEY ("eventSlug") REFERENCES "events"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_user_past_ticket_events" ADD CONSTRAINT "consumer_user_past_ticket_events_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_user_past_ticket_events" ADD CONSTRAINT "consumer_user_past_ticket_events_eventSlug_fkey" FOREIGN KEY ("eventSlug") REFERENCES "events"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_ticket_wallet_entries" ADD CONSTRAINT "consumer_ticket_wallet_entries_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_ticket_wallet_entries" ADD CONSTRAINT "consumer_ticket_wallet_entries_eventSlug_fkey" FOREIGN KEY ("eventSlug") REFERENCES "events"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_ticket_wallet_entries" ADD CONSTRAINT "consumer_ticket_wallet_entries_accessGroupId_fkey" FOREIGN KEY ("accessGroupId") REFERENCES "event_access_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_recruiterProfileId_fkey" FOREIGN KEY ("recruiterProfileId") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_genres" ADD CONSTRAINT "event_genres_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rooms" ADD CONSTRAINT "event_rooms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_room_genres" ADD CONSTRAINT "event_room_genres_eventRoomId_fkey" FOREIGN KEY ("eventRoomId") REFERENCES "event_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_lineup_entries" ADD CONSTRAINT "event_lineup_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_lineup_entry_rooms" ADD CONSTRAINT "event_lineup_entry_rooms_lineupEntryId_fkey" FOREIGN KEY ("lineupEntryId") REFERENCES "event_lineup_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_lineup_entry_rooms" ADD CONSTRAINT "event_lineup_entry_rooms_eventRoomId_fkey" FOREIGN KEY ("eventRoomId") REFERENCES "event_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_timetable_rows" ADD CONSTRAINT "event_timetable_rows_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_timetable_rows" ADD CONSTRAINT "event_timetable_rows_lineupEntryId_fkey" FOREIGN KEY ("lineupEntryId") REFERENCES "event_lineup_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_timetable_rows" ADD CONSTRAINT "event_timetable_rows_eventRoomId_fkey" FOREIGN KEY ("eventRoomId") REFERENCES "event_rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_access_groups" ADD CONSTRAINT "event_access_groups_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_access_assignments" ADD CONSTRAINT "event_access_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_access_assignments" ADD CONSTRAINT "event_access_assignments_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_access_assignments" ADD CONSTRAINT "event_access_assignments_accessGroupId_fkey" FOREIGN KEY ("accessGroupId") REFERENCES "event_access_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_applications" ADD CONSTRAINT "event_applications_accessGroupId_fkey" FOREIGN KEY ("accessGroupId") REFERENCES "event_access_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_guestlist_entries" ADD CONSTRAINT "event_guestlist_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_guestlist_entries" ADD CONSTRAINT "event_guestlist_entries_accessGroupId_fkey" FOREIGN KEY ("accessGroupId") REFERENCES "event_access_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_guestlist_entries" ADD CONSTRAINT "event_guestlist_entries_consumerUserId_fkey" FOREIGN KEY ("consumerUserId") REFERENCES "consumer_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_budget_items" ADD CONSTRAINT "event_budget_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_sections" ADD CONSTRAINT "event_ticket_sections_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_sections" ADD CONSTRAINT "event_ticket_sections_accessGroupId_fkey" FOREIGN KEY ("accessGroupId") REFERENCES "event_access_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_section_allowed_groups" ADD CONSTRAINT "event_ticket_section_allowed_groups_ticketSectionId_fkey" FOREIGN KEY ("ticketSectionId") REFERENCES "event_ticket_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_section_allowed_groups" ADD CONSTRAINT "event_ticket_section_allowed_groups_accessGroupId_fkey" FOREIGN KEY ("accessGroupId") REFERENCES "event_access_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_tiers" ADD CONSTRAINT "event_ticket_tiers_ticketSectionId_fkey" FOREIGN KEY ("ticketSectionId") REFERENCES "event_ticket_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_tiers" ADD CONSTRAINT "event_ticket_tiers_releaseAfterTierId_fkey" FOREIGN KEY ("releaseAfterTierId") REFERENCES "event_ticket_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_labels" ADD CONSTRAINT "event_labels_recruiterProfileId_fkey" FOREIGN KEY ("recruiterProfileId") REFERENCES "recruiter_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_label_links" ADD CONSTRAINT "event_label_links_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_label_links" ADD CONSTRAINT "event_label_links_eventLabelId_fkey" FOREIGN KEY ("eventLabelId") REFERENCES "event_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

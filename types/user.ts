export type ConsumerTicketStatus = "active" | "inactive" | "scanned";

export type ConsumerTicketWalletEntry = {
  eventSlug: string;
  quantity: number;
  accessGroupId: string;
  ticketLabel?: string;
  status?: ConsumerTicketStatus;
};

// Consumer-facing platform user identity for tickets, guestlists, and future follows.
export type ConsumerUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatarImageUrl?: string;
  city?: string;
  birthdate?: string;
  profileVisibility?: "public" | "private";
  notificationsEnabled?: boolean;
  favoriteGenres?: string[];
  savedEventSlugs?: string[];
  upcomingTicketEventSlugs?: string[];
  pastTicketEventSlugs?: string[];
  ticketWalletEntries?: ConsumerTicketWalletEntry[];
  createdAt: string;
};

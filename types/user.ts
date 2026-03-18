// Consumer-facing platform user identity for tickets, guestlists, and future follows.
export type ConsumerUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarImageUrl?: string;
  city?: string;
  createdAt: string;
};

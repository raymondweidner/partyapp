export type Invite = {
  id: string;
  party_id: string;
  guest_id: string;
  state?: "pending" | "accepted" | "declined" | "maybe";
};

export interface Availability {
  id?: string;
  member_id: string;
  proposal_id: string;
  status: string;
  note?: string;
  vote?: boolean;
}

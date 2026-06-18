export interface Proposal {
  id?: string;
  host_id: string;
  meetup_id: string;
  date: string;
  location: string;
  vote: boolean;
  note?: string;
  status: string;
}

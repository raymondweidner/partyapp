export interface Proposal {
  id?: string;
  host_id: string;
  meetup_id: string;
  start_at: string;
  end_at: string;
  location: string;
  vote: boolean;
  note?: string;
  status: string;
  root_folder_id?: string;
}

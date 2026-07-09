export interface Poll {
  id?: string;
  creator_id: string;
  meetup_id: string;
  title: string;
  details?: string;
  status?: string; // e.g. "Posting", "Voting", "Complete"
  root_folder_id?: string;
  entry_deadline?: string;
  vote_deadline?: string;
  icon_type?: string;
  meetup_event_id?: string;
}

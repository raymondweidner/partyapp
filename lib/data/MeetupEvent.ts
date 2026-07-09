export interface MeetupEvent {
  id?: string;
  meetup_id: string;
  host_id: string;
  start_at: string;
  end_at: string;
  location: string;
  note?: string;
  root_folder_id?: string;
}

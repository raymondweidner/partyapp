export interface EventCheckIn {
  id: string;
  meetup_event_id: string;
  member_id: string;
  status: string; // "checked_in", "checked_out"
  check_in_time: string;
  check_out_time?: string;
}

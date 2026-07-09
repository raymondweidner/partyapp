export interface Meetup {
  id?: string;
  title: string;
  creator_id: string;
  tribe_id: string;
  details?: string;
  decision_method: string;
  created_at: string;
  days_to_decide: number;
  status: string;
  recurrence_type?: string;
  recurrence_basis?: number;
  month_to_recur?: number;
  week_to_recur?: number;
  day_to_recur?: number;
  recurs_on?: string;
  event_type?: string;
  icon_type?: string;
  root_folder_id?: string;
  leader_title?: string;
}

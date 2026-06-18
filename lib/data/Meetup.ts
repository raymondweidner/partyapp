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
  recurs_every_days: number;
}

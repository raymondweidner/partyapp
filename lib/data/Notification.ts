export interface Notification {
  id?: string;
  member_id: string;
  title: string;
  body: string;
  html_body?: string;
  resource_type?: string;
  resource_id?: string;
  action_mode?: string;
  created_at?: string;
}

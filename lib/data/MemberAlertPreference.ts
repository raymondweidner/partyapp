export interface MemberAlertPreference {
  id: string;
  member_id: string;
  alert_type: string;
  email_enabled: boolean;
  push_enabled: boolean;
}

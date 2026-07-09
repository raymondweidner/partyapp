export interface Member {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  user_id?: string;
  status: string;
  profile_pic_data?: string;
  google_id?: string;
  google_refresh_token?: string;
  root_folder_id?: string;
  map_type?: string;
}

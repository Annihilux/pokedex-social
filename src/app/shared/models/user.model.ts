export interface Profile {
  user_id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  created_at?: string;
}

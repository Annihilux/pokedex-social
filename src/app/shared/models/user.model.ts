export interface Profile {
  user_id: string;
  username: string;
  email: string | null;
  avatar_url?: string | null;
  role: 'user' | 'admin';
  created_at?: string;
}

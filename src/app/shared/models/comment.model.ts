export interface Comment {
  id: number;
  user_id: string;
  pokemon_id: number;
  content: string;
  username?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

export interface CommentCreatePayload {
  user_id: string;
  pokemon_id: number;
  content: string;
}

export interface Comment {
  id: number;
  user_id: string;
  pokemon_id: number;
  content: string;
  created_at?: string;
}

export interface CommentCreatePayload {
  user_id: string;
  pokemon_id: number;
  content: string;
}
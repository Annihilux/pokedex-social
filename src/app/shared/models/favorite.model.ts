export interface Favorite {
  id: number;
  user_id: string;
  pokemon_id: number;
  pokemon_name: string;
  note: string | null;
  created_at?: string;
}

export interface FavoriteCreatePayload {
  user_id: string;
  pokemon_id: number;
  pokemon_name: string;
  note?: string | null;
}
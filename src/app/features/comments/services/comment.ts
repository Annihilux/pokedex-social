import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Comment, CommentCreatePayload } from '../../../shared/models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  constructor(private supabase: SupabaseService) {}

  async getByPokemonId(pokemonId: number): Promise<Comment[]> {
    const { data, error } = await this.supabase.client
      .from('comments')
      .select('*')
      .eq('pokemon_id', pokemonId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Comment[];
  }

  async create(payload: CommentCreatePayload): Promise<Comment> {
    const { data, error } = await this.supabase.client
      .from('comments')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as Comment;
  }
}
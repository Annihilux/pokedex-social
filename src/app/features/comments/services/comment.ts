import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Comment, CommentCreatePayload } from '../../../shared/models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  constructor(private supabase: SupabaseService) {}

  async getByPokemonId(pokemonId: number): Promise<Comment[]> {
    const { data, error } = await this.supabase.client.rpc('get_comments_with_public_profiles', {
      requested_pokemon_id: pokemonId
    });

    if (error) throw error;
    return (data ?? []).map((row: any) => this.mapComment(row));
  }

  async create(payload: CommentCreatePayload): Promise<Comment> {
    const { data, error } = await this.supabase.client
      .from('comments')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return this.mapComment(data);
  }

  async update(id: number, payload: { content: string }): Promise<Comment> {
    const { data, error } = await this.supabase.client
      .from('comments')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return this.mapComment(data);
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getAllGlobal(): Promise<Comment[]> {
    const { data, error } = await this.supabase.client.rpc('get_all_comments_with_public_profiles');

    if (error) throw error;
    return (data ?? []).map((row: any) => this.mapComment(row));
  }

  private mapComment(row: any): Comment {
    return {
      id: row.id,
      user_id: row.user_id,
      pokemon_id: row.pokemon_id,
      content: row.content,
      created_at: row.created_at,
      username: row?.username ?? row?.profiles?.username ?? null,
      avatar_url: row?.avatar_url ?? row?.profiles?.avatar_url ?? null
    };
  }
}

import { Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Favorite } from '../../../shared/models/favorite.model';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  async addFavorite(pokemonId: number): Promise<void> {
    const userId = this.requireUserId();

    const { error } = await this.supabase.client.from('favorites').upsert(
      { user_id: userId, pokemon_id: pokemonId },
      { onConflict: 'user_id,pokemon_id', ignoreDuplicates: true }
    );

    if (error) throw error;
  }

  async removeFavorite(pokemonId: number): Promise<void> {
    const userId = this.requireUserId();

    const { error } = await this.supabase.client
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('pokemon_id', pokemonId);

    if (error) throw error;
  }

  async getFavorites(): Promise<Favorite[]> {
    const { data, error } = await this.supabase.client
      .from('favorites')
      .select('user_id,pokemon_id,created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Favorite[];
  }

  async isFavorite(pokemonId: number): Promise<boolean> {
    const userId = this.auth.user()?.id;
    if (!userId) return false;

    const { data, error } = await this.supabase.client
      .from('favorites')
      .select('pokemon_id')
      .eq('user_id', userId)
      .eq('pokemon_id', pokemonId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  }

  async getFavoritePokemonIds(): Promise<number[]> {
    const favorites = await this.getFavorites();
    return favorites.map((favorite) => favorite.pokemon_id);
  }

  private requireUserId(): string {
    const userId = this.auth.user()?.id;
    if (!userId) {
      throw new Error('Debes iniciar sesion.');
    }

    return userId;
  }
}

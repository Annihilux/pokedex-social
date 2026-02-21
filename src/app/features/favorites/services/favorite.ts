import { Injectable } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Favorite, FavoriteCreatePayload } from '../../../shared/models/favorite.model';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  constructor(private supabase: SupabaseService) {}

  /** Devuelve los favoritos del usuario autenticado (RLS se encarga de filtrar) */
  async getAll(): Promise<Favorite[]> {
    const { data, error } = await this.supabase.client
      .from('favorites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Favorite[];
  }

  /** Crea un favorito (solo autenticados y para sí mismos por policy) */
  async create(payload: FavoriteCreatePayload): Promise<Favorite> {
    const { data, error } = await this.supabase.client
      .from('favorites')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as Favorite;
  }
}
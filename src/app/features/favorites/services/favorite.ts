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

  async getById(id: number): Promise<Favorite> {
  const { data, error } = await this.supabase.client
    .from('favorites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Favorite;
  }

  async update(id: number, payload: { note: string | null }): Promise<Favorite> {
  const { data, error } = await this.supabase.client
    .from('favorites')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Favorite;
  }

  async delete(id: number): Promise<void> {
  const { error } = await this.supabase.client
    .from('favorites')
    .delete()
    .eq('id', id);

    if (error) throw error;
  }

  async getAllGlobal(): Promise<Favorite[]> {
    const { data, error } = await this.supabase.client
      .from('favorites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Favorite[];
  }

}
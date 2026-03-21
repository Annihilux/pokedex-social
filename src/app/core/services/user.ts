import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile } from '../../shared/models/user.model';
import { User } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private supabase: SupabaseService) {}

  private buildFallbackUsername(user: User): string {
    const metadataUsername = typeof user.user_metadata?.['username'] === 'string'
      ? user.user_metadata['username'].trim()
      : '';

    if (metadataUsername) return metadataUsername;

    const emailLocalPart = user.email?.split('@')[0]?.trim();
    if (emailLocalPart) return emailLocalPart;

    return `user_${user.id.replace(/-/g, '').slice(0, 8)}`;
  }

  private async createMissingProfile(user: User): Promise<Profile> {
    const fallbackProfile = {
      user_id: user.id,
      username: this.buildFallbackUsername(user),
      email: user.email ?? null,
      role: 'user' as const
    };

    const { data, error } = await this.supabase.client
      .from('profiles')
      .insert(fallbackProfile)
      .select('*')
      .single();

    if (!error) return data as Profile;

    if (error.code === '23505') {
      const retryProfile = {
        ...fallbackProfile,
        username: `user_${user.id.replace(/-/g, '').slice(0, 8)}`
      };

      const retry = await this.supabase.client
        .from('profiles')
        .insert(retryProfile)
        .select('*')
        .single();

      if (retry.error && retry.error.code !== '23505') throw retry.error;
      if (retry.data) return retry.data as Profile;
    } else {
      throw error;
    }

    const existing = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (!existing.data) {
      throw new Error('No se pudo crear ni recuperar el perfil del usuario.');
    }

    return existing.data as Profile;
  }

  async getMyProfile(): Promise<Profile | null> {
    const { data: userData, error: userError } = await this.supabase.client.auth.getUser();
    if (userError) throw userError;

    const user = userData.user;
    if (!user) return null;

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as Profile;

    return this.createMissingProfile(user);
  }

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Profile[];
  }

  async updateRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ role })
      .eq('user_id', userId);

    if (error) throw error;
  }
}

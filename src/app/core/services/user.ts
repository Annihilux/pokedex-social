import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private supabase: SupabaseService) {}

  async getMyProfile(): Promise<Profile | null> {
    const { data: userData, error: userError } = await this.supabase.client.auth.getUser();
    if (userError) throw userError;

    const user = userData.user;
    if (!user) return null;

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data as Profile;
  }
}
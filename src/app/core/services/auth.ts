import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private supabaseService: SupabaseService) {}

  // Registro
  async register(email: string, password: string) {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  // Login
  async login(email: string, password: string) {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  // Logout
  async logout() {
    const { error } = await this.supabaseService.client.auth.signOut();
    if (error) throw error;
  }

  // Usuario actual
  async getCurrentUser(): Promise<User | null> {
    const { data } = await this.supabaseService.client.auth.getUser();
    return data.user;
  }

  // Obtener sesión actual (JWT)
  async getSession() {
    const { data } = await this.supabaseService.client.auth.getSession();
    return data.session;
  }

  // Escuchar cambios de sesión
  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.supabaseService.client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

}
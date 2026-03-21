import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserService } from './user';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _session = signal<Session | null>(null);
  private _user = signal<User | null>(null);
  private _profile = signal<Profile | null>(null);
  private initPromise: Promise<void>;
  private _ready = signal(false);

  ready = computed(() => this._ready());

  // Expuestos
  session = computed(() => this._session());
  user = computed(() => this._user());
  profile = computed(() => this._profile());

  // Derivados (útiles para navbar/guards)
  isAuthenticated = computed(() => !!this._session());
  isAdmin = computed(() => this._profile()?.role === 'admin');

  constructor(
    private supabase: SupabaseService,
    private userService: UserService
  ) {
    this.initPromise = this.init();

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
      this.loadProfileSafe();
    });
  }

  private async init() {
    const { data } = await this.supabase.client.auth.getSession();
    this._session.set(data.session);
    this._user.set(data.session?.user ?? null);
    await this.loadProfileSafe();
    this._ready.set(true);
  }

  whenReady(): Promise<void> {
    return this.initPromise;
  }

  private async loadProfileSafe() {
    try {
      if (!this._user()) {
        this._profile.set(null);
        return;
      }
      const profile = await this.userService.getMyProfile();
      this._profile.set(profile);
    } catch {
      // Evita romper la app si aún no existe o si falla momentáneamente
      this._profile.set(null);
    }
  }

  private normalizeUsername(username: string): string {
    return (username ?? '').trim();
  }

  async register(email: string, password: string, username: string) {
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) {
      throw new Error('El username es obligatorio.');
    }

    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizedUsername
        }
      }
    });
    if (error) throw error;
    return data;
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async logout() {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    this._profile.set(null);
  }
}

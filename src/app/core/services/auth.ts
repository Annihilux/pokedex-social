import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserService } from './user';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../../shared/models/user.model';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const PASSWORD_MIN_LENGTH = 6;

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

  private normalizeEmail(email: string): string {
    return (email ?? '').trim();
  }

  private validateUsername(username: string): void {
    if (!username) {
      throw new Error('El username es obligatorio.');
    }

    if (username.length < USERNAME_MIN_LENGTH) {
      throw new Error(`El username debe tener al menos ${USERNAME_MIN_LENGTH} caracteres.`);
    }

    if (username.length > USERNAME_MAX_LENGTH) {
      throw new Error(`El username no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`);
    }

    if (!USERNAME_PATTERN.test(username)) {
      throw new Error('El username solo puede contener letras, numeros, punto, guion y guion bajo.');
    }
  }

  private mapAuthError(error: any, context: 'login' | 'register'): Error {
    const message = String(error?.message ?? '').toLowerCase();

    if (context === 'login') {
      if (message.includes('invalid login credentials')) {
        return new Error('Correo o contrasena incorrectos.');
      }

      if (message.includes('email not confirmed')) {
        return new Error('Debes confirmar tu correo antes de iniciar sesion.');
      }
    }

    if (context === 'register') {
      if (message.includes('user already registered')) {
        return new Error('Ya existe una cuenta con ese correo.');
      }

      if (message.includes('profiles_username_unique_ci')) {
        return new Error('El username ya esta en uso.');
      }

      if (message.includes('profiles_username_length')) {
        return new Error(`El username debe tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres.`);
      }

      if (message.includes('profiles_username_format')) {
        return new Error('El username contiene caracteres no permitidos.');
      }
    }

    return new Error(error?.message ?? (context === 'login' ? 'Error en el login.' : 'Error registrando usuario.'));
  }

  private async ensureUsernameAvailable(username: string): Promise<void> {
    const { data, error } = await this.supabase.client.rpc('is_username_available', {
      requested_username: username
    });

    if (error) {
      throw new Error('No se pudo validar el username en este momento.');
    }

    if (!data) {
      throw new Error('El username ya esta en uso.');
    }
  }

  async register(email: string, password: string, username: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedEmail) {
      throw new Error('El correo es obligatorio.');
    }

    this.validateUsername(normalizedUsername);
    await this.ensureUsernameAvailable(normalizedUsername);

    if (!password) {
      throw new Error('La contrasena es obligatoria.');
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
    }

    const { data, error } = await this.supabase.client.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: normalizedUsername
        }
      }
    });
    if (error) throw this.mapAuthError(error, 'register');
    return data;
  }

  async login(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('El correo es obligatorio.');
    }

    if (!password) {
      throw new Error('La contrasena es obligatoria.');
    }

    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });
    if (error) throw this.mapAuthError(error, 'login');
    return data;
  }

  async logout() {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    this._profile.set(null);
  }
}

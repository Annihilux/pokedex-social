import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { Profile } from '../../shared/models/user.model';
import { SupabaseService } from './supabase.service';
import { UserService } from './user';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const PASSWORD_MIN_LENGTH = 6;
const RANDOM_USERNAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _session = signal<Session | null>(null);
  private _user = signal<User | null>(null);
  private _profile = signal<Profile | null>(null);
  private _ready = signal(false);
  private initPromise: Promise<void>;
  private authStateQueue = Promise.resolve();
  private oauthRedirectHandled = false;

  ready = computed(() => this._ready());

  session = computed(() => this._session());
  user = computed(() => this._user());
  profile = computed(() => this._profile());

  isAuthenticated = computed(() => !!this._session());
  isAdmin = computed(() => this._profile()?.role === 'admin');

  constructor(
    private supabase: SupabaseService,
    private userService: UserService,
    private router: Router
  ) {
    this.initPromise = this.init();

    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      void this.scheduleAuthStateSync(event, session);
    });
  }

  private async init() {
    const { data } = await this.supabase.client.auth.getSession();
    await this.scheduleAuthStateSync('INITIAL_SESSION', data.session);
    this._ready.set(true);
  }

  whenReady(): Promise<void> {
    return this.initPromise;
  }

  private scheduleAuthStateSync(event: AuthChangeEvent | 'INITIAL_SESSION', session: Session | null): Promise<void> {
    const task = this.authStateQueue.then(() => this.syncAuthState(event, session));
    this.authStateQueue = task.catch(() => undefined);
    return task;
  }

  private async syncAuthState(event: AuthChangeEvent | 'INITIAL_SESSION', session: Session | null): Promise<void> {
    this._session.set(session);
    this._user.set(session?.user ?? null);

    if (!session) {
      this._profile.set(null);
      return;
    }

    let profile = await this.userService.getMyProfile();

    if (this.isGoogleUser(session.user) && (!this.getUserMetadataUsername(session.user) || !profile)) {
      profile = await this.createProfileForOAuthUser(session, profile);
    }

    this._profile.set(profile);

    if (this.shouldRedirectAfterOAuth(event, session.user)) {
      this.oauthRedirectHandled = true;
      await this.router.navigate(['/']);
    }
  }

  private isGoogleUser(user: User | null): boolean {
    return user?.app_metadata?.['provider'] === 'google';
  }

  private getUserMetadataUsername(user: User | null): string {
    return typeof user?.user_metadata?.['username'] === 'string'
      ? user.user_metadata['username'].trim()
      : '';
  }

  private hasOAuthCallbackParams(): boolean {
    if (typeof window === 'undefined') return false;

    return window.location.search.includes('code=') || window.location.hash.includes('access_token=');
  }

  private shouldRedirectAfterOAuth(event: AuthChangeEvent | 'INITIAL_SESSION', user: User | null): boolean {
    if (this.oauthRedirectHandled || !this.isGoogleUser(user) || !this.hasOAuthCallbackParams()) {
      return false;
    }

    if (typeof window === 'undefined') return false;

    const path = window.location.pathname;
    return (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && (path === '/' || path === '/login' || path === '/register');
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

  private async isUsernameAvailable(username: string): Promise<boolean> {
    const { data, error } = await this.supabase.client.rpc('is_username_available', {
      requested_username: username
    });

    if (error) {
      throw new Error('No se pudo validar el username en este momento.');
    }

    return !!data;
  }

  private async ensureUsernameAvailable(username: string): Promise<void> {
    const available = await this.isUsernameAvailable(username);

    if (!available) {
      throw new Error('El username ya esta en uso.');
    }
  }

  private createRandomUsernameCandidate(length: number): string {
    const values = new Uint32Array(length);

    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(values);
    } else {
      for (let i = 0; i < length; i += 1) {
        values[i] = Math.floor(Math.random() * RANDOM_USERNAME_CHARS.length);
      }
    }

    return Array.from(values, (value) => RANDOM_USERNAME_CHARS[value % RANDOM_USERNAME_CHARS.length]).join('');
  }

  async signInWithGoogle() {
    const { data, error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      throw new Error(error.message ?? 'No se pudo iniciar sesion con Google.');
    }

    return data;
  }

  async generateUniqueRandomUsername(length: number = 8): Promise<string> {
    let candidate = '';

    do {
      candidate = this.createRandomUsernameCandidate(length);
    } while (!(await this.isUsernameAvailable(candidate)));

    return candidate;
  }

  async createProfileForOAuthUser(session: Session, existingProfile?: Profile | null): Promise<Profile> {
    const profile = existingProfile ?? (await this.userService.getMyProfile());
    const metadataUsername = this.getUserMetadataUsername(session.user);

    if (profile) {
      if (profile.username !== metadataUsername) {
        const { error: updateMetadataError } = await this.supabase.client.auth.updateUser({
          data: { username: profile.username }
        });

        if (updateMetadataError) {
          throw new Error('No se pudo sincronizar el username del usuario.');
        }
      }

      return profile;
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const newUsername = await this.generateUniqueRandomUsername();
      const { data, error } = await this.supabase.client
        .from('profiles')
        .insert({
          user_id: session.user.id,
          username: newUsername,
          email: session.user.email ?? null,
          role: 'user'
        })
        .select('*')
        .single();

      if (!error) {
        const createdProfile = data as Profile;
        const { error: updateUserError } = await this.supabase.client.auth.updateUser({
          data: { username: newUsername }
        });

        if (updateUserError) {
          throw new Error('No se pudo guardar el username del usuario.');
        }

        return createdProfile;
      }

      const recoveredProfile = await this.userService.getMyProfile();
      if (recoveredProfile) {
        if (recoveredProfile.username !== metadataUsername) {
          const { error: recoverMetadataError } = await this.supabase.client.auth.updateUser({
            data: { username: recoveredProfile.username }
          });

          if (recoverMetadataError) {
            throw new Error('No se pudo sincronizar el username del usuario.');
          }
        }

        return recoveredProfile;
      }

      if (error.code !== '23505') {
        throw new Error('No se pudo crear el perfil del usuario.');
      }
    }

    throw new Error('No se pudo crear el perfil del usuario.');
  }

  async updateUsername(newUsername: string): Promise<void> {
    const user = this._user();
    if (!user) {
      throw new Error('Debes iniciar sesion para cambiar tu username.');
    }

    const normalizedUsername = this.normalizeUsername(newUsername);
    this.validateUsername(normalizedUsername);

    const currentProfile = this._profile();
    if (currentProfile?.username !== normalizedUsername) {
      await this.ensureUsernameAvailable(normalizedUsername);
    }

    const { error: updateProfileError } = await this.supabase.client
      .from('profiles')
      .update({ username: normalizedUsername })
      .eq('user_id', user.id);

    if (updateProfileError) {
      throw new Error('No se pudo actualizar el username.');
    }

    const { error: updateUserError } = await this.supabase.client.auth.updateUser({
      data: { username: normalizedUsername }
    });

    if (updateUserError) {
      throw new Error('No se pudo actualizar el username.');
    }

    const profile = await this.userService.getMyProfile();
    this._profile.set(profile);
  }

  async updatePassword(newPassword: string): Promise<void> {
    if (!newPassword) {
      throw new Error('La contrasena es obligatoria.');
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
    }

    const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });

    if (error) {
      throw new Error(error.message ?? 'No se pudo actualizar la contrasena.');
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

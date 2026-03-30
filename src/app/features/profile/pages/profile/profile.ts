import { CommonModule } from '@angular/common';
import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AvatarService } from '../../../../core/services/avatar';
import { AuthService } from '../../../../core/services/auth';

const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  public avatar = inject(AvatarService);

  usernameLoading = signal(false);
  passwordLoading = signal(false);
  avatarProcessing = signal(false);
  avatarLoading = signal(false);

  usernameErrorMsg = signal<string | null>(null);
  usernameSuccessMsg = signal<string | null>(null);
  passwordErrorMsg = signal<string | null>(null);
  passwordSuccessMsg = signal<string | null>(null);
  avatarErrorMsg = signal<string | null>(null);
  avatarSuccessMsg = signal<string | null>(null);
  avatarPreviewUrl = signal<string | null>(null);

  private avatarFile: File | null = null;

  usernameForm = this.fb.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(USERNAME_MAX_LENGTH),
        Validators.pattern(USERNAME_PATTERN)
      ]
    ]
  });

  passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(public auth: AuthService) {
    effect(() => {
      const profile = this.auth.profile();

      if (!profile) return;

      this.usernameForm.patchValue(
        {
          username: profile.username
        },
        { emitEvent: false }
      );
    });
  }

  async saveUsername() {
    this.usernameErrorMsg.set(null);
    this.usernameSuccessMsg.set(null);

    if (this.usernameForm.invalid) {
      this.usernameForm.markAllAsTouched();
      this.usernameErrorMsg.set('Revisa el username antes de guardar.');
      return;
    }

    try {
      this.usernameLoading.set(true);
      await this.auth.updateUsername(this.usernameForm.getRawValue().username ?? '');
      this.usernameSuccessMsg.set('Username actualizado correctamente.');
    } catch (e: any) {
      this.usernameErrorMsg.set(e?.message ?? 'No se pudo actualizar el username.');
    } finally {
      this.usernameLoading.set(false);
    }
  }

  async savePassword() {
    this.passwordErrorMsg.set(null);
    this.passwordSuccessMsg.set(null);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.passwordErrorMsg.set('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    try {
      this.passwordLoading.set(true);
      await this.auth.updatePassword(this.passwordForm.getRawValue().password ?? '');
      this.passwordSuccessMsg.set('Contrasena guardada correctamente.');
      this.passwordForm.reset();
    } catch (e: any) {
      this.passwordErrorMsg.set(e?.message ?? 'No se pudo actualizar la contrasena.');
    } finally {
      this.passwordLoading.set(false);
    }
  }

  currentAvatarUrl(): string {
    return this.avatarPreviewUrl() || this.avatar.resolveAvatarUrl(this.auth.profile()?.avatar_url);
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.clearPreparedAvatar();
      return;
    }

    this.avatarErrorMsg.set(null);
    this.avatarSuccessMsg.set(null);

    try {
      this.avatarProcessing.set(true);
      const preparedAvatar = await this.avatar.prepareAvatarUpload(file);
      this.setAvatar(preparedAvatar.file, preparedAvatar.previewUrl);
    } catch (e: any) {
      this.clearPreparedAvatar();
      this.avatarErrorMsg.set(e?.message ?? 'No se pudo preparar la foto de perfil.');
      input.value = '';
    } finally {
      this.avatarProcessing.set(false);
    }
  }

  async saveAvatar() {
    this.avatarErrorMsg.set(null);
    this.avatarSuccessMsg.set(null);

    if (!this.avatarFile) {
      this.avatarErrorMsg.set('Selecciona una imagen antes de guardar.');
      return;
    }

    try {
      this.avatarLoading.set(true);
      await this.auth.updateAvatar(this.avatarFile);
      this.avatarSuccessMsg.set('Foto de perfil actualizada correctamente.');
      this.clearPreparedAvatar();
    } catch (e: any) {
      this.avatarErrorMsg.set(e?.message ?? 'No se pudo actualizar la foto de perfil.');
    } finally {
      this.avatarLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.clearPreparedAvatar();
  }

  private setAvatar(file: File, previewUrl: string): void {
    this.avatar.revokePreviewUrl(this.avatarPreviewUrl());
    this.avatarFile = file;
    this.avatarPreviewUrl.set(previewUrl);
  }

  private clearPreparedAvatar(): void {
    this.avatar.revokePreviewUrl(this.avatarPreviewUrl());
    this.avatarFile = null;
    this.avatarPreviewUrl.set(null);
  }
}

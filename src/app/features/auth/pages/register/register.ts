import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AvatarService } from '../../../../core/services/avatar';
import { AuthService } from '../../../../core/services/auth';

const USERNAME_MAX_LENGTH = 30;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})

export class RegisterComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  public avatar = inject(AvatarService);

  loading = signal(false);
  avatarProcessing = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  avatarPreviewUrl = signal<string | null>(null);

  private avatarFile: File | null = null;
  form!: FormGroup;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(USERNAME_MAX_LENGTH), Validators.pattern(USERNAME_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  async submit() {
    this.errorMsg.set(null);
    this.successMsg.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Revisa los campos del formulario.');
      return;
    }

    const { username, email, password, confirmPassword } = this.form.value;

    if (password !== confirmPassword) {
      this.errorMsg.set('Las contraseÃ±as no coinciden.');
      return;
    }

    try {
      this.loading.set(true);
      const result = await this.auth.register(email, password, username, this.avatarFile);

      if (result.session) {
        await this.router.navigate(['/']);
        return;
      }

      this.successMsg.set('Registro correcto. Revisa tu correo antes de iniciar sesion.');
      this.form.reset();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error registrando usuario.');
    } finally {
      this.loading.set(false);
    }
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      this.clearPreparedAvatar();
      return;
    }

    this.errorMsg.set(null);

    try {
      this.avatarProcessing.set(true);
      const preparedAvatar = await this.avatar.prepareAvatarUpload(file);
      this.setAvatar(preparedAvatar.file, preparedAvatar.previewUrl);
    } catch (e: any) {
      this.clearPreparedAvatar();
      this.errorMsg.set(e?.message ?? 'No se pudo preparar la foto de perfil.');
      input.value = '';
    } finally {
      this.avatarProcessing.set(false);
    }
  }

  async signInWithGoogle() {
    this.errorMsg.set(null);
    this.successMsg.set(null);

    try {
      await this.auth.signInWithGoogle();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error iniciando registro con Google.');
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

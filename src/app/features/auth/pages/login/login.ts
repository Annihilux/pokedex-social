import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {

  loading = signal(false);
  resetLoading = signal(false);
  showResetForm = signal(false);
  errorMsg = signal<string | null>(null);
  resetSuccessMsg = signal<string | null>(null);

  form!: FormGroup;
  resetForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async submit() {
    this.errorMsg.set(null);
    this.resetSuccessMsg.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Revisa los campos.');
      return;
    }

    const { email, password } = this.form.value;

    try {
      this.loading.set(true);
      await this.auth.login(email, password);
      await this.router.navigate(['/']);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error en el login.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleResetForm() {
    this.errorMsg.set(null);
    this.resetSuccessMsg.set(null);
    const nextVisible = !this.showResetForm();
    this.showResetForm.set(nextVisible);

    if (nextVisible) {
      const loginEmail = String(this.form.get('email')?.value ?? '').trim();
      const resetEmail = String(this.resetForm.get('email')?.value ?? '').trim();

      if (loginEmail && !resetEmail) {
        this.resetForm.patchValue({ email: loginEmail });
      }
    }
  }

  async sendPasswordReset() {
    this.errorMsg.set(null);
    this.resetSuccessMsg.set(null);

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { email } = this.resetForm.value;

    try {
      this.resetLoading.set(true);
      await this.auth.requestPasswordReset(email);
      this.resetSuccessMsg.set('Se ha enviado un correo para restablecer tu contrase\u00f1a');
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'No se pudo enviar el correo de recuperacion.');
    } finally {
      this.resetLoading.set(false);
    }
  }
}


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
  errorMsg = signal<string | null>(null);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  async submit() {
    this.errorMsg.set(null);

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

  async signInWithGoogle() {
    this.errorMsg.set(null);

    try {
      await this.auth.signInWithGoogle();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error iniciando sesion con Google.');
    }
  }
}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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

export class RegisterComponent {

  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
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
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    try {
      this.loading.set(true);
      const result = await this.auth.register(email, password, username);

      if (result.session) {
        await this.router.navigate(['/dashboard']);
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
}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FavoriteService } from '../../services/favorite';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create.html',
  styleUrl: './create.scss'
})
export class CreateComponent {
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private favoritesService: FavoriteService,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      pokemon_id: ['', [Validators.required]],
      pokemon_name: ['', [Validators.required, Validators.minLength(2)]],
      note: ['']
    });
  }

  async submit() {
    this.errorMsg.set(null);
    this.successMsg.set(null);

    if (this.form.invalid) {
      this.errorMsg.set('Revisa los campos.');
      return;
    }

    const userId = this.auth.user()?.id;
    if (!userId) {
      this.errorMsg.set('No estás autenticado.');
      return;
    }

    try {
      this.loading.set(true);
      const payload = {
        user_id: userId,
        pokemon_id: Number(this.form.value.pokemon_id),
        pokemon_name: String(this.form.value.pokemon_name).toLowerCase(),
        note: this.form.value.note ?? null
      };

      await this.favoritesService.create(payload);
      this.successMsg.set('Favorito creado.');

      await this.router.navigate(['/favorites']);
    } catch (e: any) {
      // Si el usuario intenta duplicar un pokemon, saltará el unique index
      this.errorMsg.set(e?.message ?? 'Error creando favorito.');
    } finally {
      this.loading.set(false);
    }
  }
}
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { FavoriteService } from '../../services/favorite';
import { Favorite } from '../../../../shared/models/favorite.model';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit.html',
  styleUrl: './edit.scss'
})
export class EditComponent {
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  favorite = signal<Favorite | null>(null);
  form!: FormGroup;

  private favId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private favoritesService: FavoriteService
  ) {
    this.form = this.fb.group({
      note: ['']
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
      this.errorMsg.set('ID inválido.');
      this.loading.set(false);
      return;
    }

    this.favId = id;
    this.load(id);
  }

  async load(id: number) {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);

      const fav = await this.favoritesService.getById(id);
      this.favorite.set(fav);

      // Pre-rellenar
      this.form.patchValue({
        note: fav.note ?? ''
      });

    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando favorito.');
    } finally {
      this.loading.set(false);
    }
  }

  async submit() {
    this.errorMsg.set(null);
    this.successMsg.set(null);

    try {
      this.saving.set(true);

      const noteValue = this.form.value.note ?? '';
      const payload = { note: noteValue.trim() === '' ? null : String(noteValue) };

      await this.favoritesService.update(this.favId, payload);

      this.successMsg.set('Favorito actualizado.');
      await this.router.navigate(['/favorites', this.favId]);

    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error actualizando favorito.');
    } finally {
      this.saving.set(false);
    }
  }
}
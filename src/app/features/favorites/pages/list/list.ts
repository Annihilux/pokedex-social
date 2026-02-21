import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FavoriteService } from '../../services/favorite';
import { Favorite } from '../../../../shared/models/favorite.model';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html',
  styleUrl: './list.scss'
})
export class ListComponent {
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  favorites = signal<Favorite[]>([]);

  constructor(private favoritesService: FavoriteService) {
    this.load();
  }

  async load() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);
      const data = await this.favoritesService.getAll();
      this.favorites.set(data);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando favoritos.');
    } finally {
      this.loading.set(false);
    }
  }
}
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { FavoriteService } from '../../../favorites/services/favorite';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  favoritesCount = signal<number>(0);

  constructor(public auth: AuthService, private favoritesService: FavoriteService) {
    this.load();
  }

  async load() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);

      const favs = await this.favoritesService.getAll();
      this.favoritesCount.set(favs.length);

    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando dashboard.');
    } finally {
      this.loading.set(false);
    }
  }
}
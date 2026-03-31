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
  removingId = signal<number | null>(null);
  errorMsg = signal<string | null>(null);
  favorites = signal<Favorite[]>([]);

  constructor(private favoritesService: FavoriteService) {
    this.load();
  }

  async load() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);
      const data = await this.favoritesService.getFavorites();
      this.favorites.set(data);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando favoritos.');
    } finally {
      this.loading.set(false);
    }
  }

  async remove(pokemonId: number) {
    try {
      this.removingId.set(pokemonId);
      await this.favoritesService.removeFavorite(pokemonId);
      this.favorites.update((items) => items.filter((item) => item.pokemon_id !== pokemonId));
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error eliminando favorito.');
    } finally {
      this.removingId.set(null);
    }
  }

  spriteUrl(id: number) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }
}

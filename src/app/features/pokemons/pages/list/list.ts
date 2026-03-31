import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PokemonService } from '../../services/pokemon';
import { PokemonListItem } from '../../../../shared/models/pokemon.model';
import { FavoriteService } from '../../../favorites/services/favorite';

type PokemonCard = { id: number; name: string };

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
  favoritesCounts = signal<Record<number, number>>({});

  // listado ya mapeado a cards
  cards = signal<PokemonCard[]>([]);

  // búsqueda local
  query = signal('');

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.cards();
    return this.cards().filter(p => p.name.includes(q) || String(p.id).includes(q));
  });

  limit = 24;
  offset = signal(0);

  constructor(
    private pokemonService: PokemonService,
    private favoriteService: FavoriteService
  ) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.favoritesCounts.set({});

    this.pokemonService.getPokemons(this.limit, this.offset()).subscribe({
      next: (res) => {
        const mapped = res.results.map((p: PokemonListItem) => {
          const id = Number(this.getIdFromUrl(p.url));
          return { id, name: p.name };
        });
        this.cards.set(mapped);
        void this.loadFavoritesCounts(mapped.map((pokemon) => pokemon.id));
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error cargando Pokémons.');
        this.loading.set(false);
      }
    });
  }

  nextPage() {
    this.offset.set(this.offset() + this.limit);
    this.load();
  }

  prevPage() {
    this.offset.set(Math.max(0, this.offset() - this.limit));
    this.load();
  }

  setQuery(value: string) {
    this.query.set(value);
  }

  spriteUrl(id: number) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  favoritesCount(id: number): number {
    return this.favoritesCounts()[id] ?? 0;
  }

  private async loadFavoritesCounts(pokemonIds: number[]): Promise<void> {
    try {
      const counts = await this.favoriteService.getFavoritesCounts(pokemonIds);
      this.favoritesCounts.set(counts);
    } catch {
      this.favoritesCounts.set({});
    }
  }

  private getIdFromUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1];
  }
}

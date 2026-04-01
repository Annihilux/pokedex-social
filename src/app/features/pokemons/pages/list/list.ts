import { Component, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
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
export class ListComponent implements OnDestroy {
  private pageLoading = signal(true);
  private searchLoading = signal(false);
  loading = computed(() => this.pageLoading() || this.searchLoading());

  errorMsg = signal<string | null>(null);
  favoritesCounts = signal<Record<number, number>>({});

  cards = signal<PokemonCard[]>([]);
  searchResults = signal<PokemonCard[]>([]);

  activeQuery = signal('');
  isSearchMode = computed(() => this.activeQuery().length > 0);
  visibleCards = computed(() => (this.isSearchMode() ? this.searchResults() : this.cards()));

  limit = 48;
  offset = signal(0);

  private pageRequestSub: Subscription | null = null;
  private searchRequestSub: Subscription | null = null;

  constructor(
    private pokemonService: PokemonService,
    private favoriteService: FavoriteService
  ) {
    this.loadPage();
  }

  ngOnDestroy(): void {
    this.pageRequestSub?.unsubscribe();
    this.searchRequestSub?.unsubscribe();
  }

  loadPage(): void {
    this.pageLoading.set(true);
    this.errorMsg.set(null);
    this.pageRequestSub?.unsubscribe();

    this.pageRequestSub = this.pokemonService.getPokemons(this.limit, this.offset()).subscribe({
      next: (res) => {
        const mapped = res.results.map((p: PokemonListItem) => {
          const id = Number(this.getIdFromUrl(p.url));
          return { id, name: p.name };
        });

        this.cards.set(mapped);
        void this.loadFavoritesCounts(mapped.map((pokemon) => pokemon.id));
        this.pageLoading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error cargando Pokemons.');
        this.pageLoading.set(false);
      }
    });
  }

  nextPage(): void {
    this.offset.set(this.offset() + this.limit);
    this.loadPage();
  }

  prevPage(): void {
    this.offset.set(Math.max(0, this.offset() - this.limit));
    this.loadPage();
  }

  runSearch(rawQuery: string): void {
    const term = rawQuery.trim().toLowerCase();
    this.errorMsg.set(null);
    this.searchRequestSub?.unsubscribe();
    this.searchLoading.set(false);

    if (!term) {
      this.activeQuery.set('');
      this.searchResults.set([]);
      return;
    }

    this.searchPokemon(term);
  }

  spriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  favoritesCount(id: number): number {
    return this.favoritesCounts()[id] ?? 0;
  }

  private searchPokemon(term: string): void {
    this.searchLoading.set(true);
    this.searchRequestSub?.unsubscribe();

    this.searchRequestSub = this.pokemonService.getPokemonById(term).subscribe({
      next: (pokemon) => {
        this.activeQuery.set(term);
        this.searchResults.set([{ id: pokemon.id, name: pokemon.name }]);
        void this.loadFavoritesCounts([pokemon.id]);
        this.searchLoading.set(false);
      },
      error: () => {
        this.activeQuery.set(term);
        this.searchResults.set([]);
        this.searchLoading.set(false);
      }
    });
  }

  private async loadFavoritesCounts(pokemonIds: number[]): Promise<void> {
    try {
      const counts = await this.favoriteService.getFavoritesCounts(pokemonIds);
      this.favoritesCounts.set({ ...this.favoritesCounts(), ...counts });
    } catch {
      // Keep current counts if favorites request fails
    }
  }

  private getIdFromUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1];
  }
}

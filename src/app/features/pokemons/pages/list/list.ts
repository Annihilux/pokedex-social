import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PokemonService } from '../../services/pokemon';
import { PokemonListItem } from '../../../../shared/models/pokemon.model';

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

  constructor(private pokemonService: PokemonService) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.pokemonService.getPokemons(this.limit, this.offset()).subscribe({
      next: (res) => {
        const mapped = res.results.map((p: PokemonListItem) => {
          const id = Number(this.getIdFromUrl(p.url));
          return { id, name: p.name };
        });
        this.cards.set(mapped);
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

  private getIdFromUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1];
  }
}
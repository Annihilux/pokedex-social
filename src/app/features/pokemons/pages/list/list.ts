import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PokemonService } from '../../services/pokemon';
import { PokemonListItem } from '../../../../shared/models/pokemon.model';

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
  pokemons = signal<PokemonListItem[]>([]);

  // paginación simple
  limit = 20;
  offset = signal(0);

  constructor(private pokemonService: PokemonService) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.pokemonService.getPokemons(this.limit, this.offset()).subscribe({
      next: (res) => {
        this.pokemons.set(res.results);
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

  getIdFromUrl(url: string): string {
    // url: https://pokeapi.co/api/v2/pokemon/1/
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1];
  }
}
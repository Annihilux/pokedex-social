import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { FavoriteService } from '../../services/favorite';
import { Favorite } from '../../../../shared/models/favorite.model';

import { PokemonService } from '../../../pokemons/services/pokemon';
import { PokemonDetail } from '../../../../shared/models/pokemon.model';

import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.html',
  styleUrl: './detail.scss'
})


export class DetailComponent {
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  favorite = signal<Favorite | null>(null);

  // extra: datos reales del pokemon
  pokemonLoading = signal(false);
  pokemon = signal<PokemonDetail | null>(null);

  constructor(
    private route: ActivatedRoute,
    private favoritesService: FavoriteService,
    private pokemonService: PokemonService,
    private auth: AuthService,
    private router: Router
  ) {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
      this.errorMsg.set('ID inválido.');
      this.loading.set(false);
      return;
    }

    this.load(id);

  }

  get isAdmin() {
    return this.auth.isAdmin();
  }

  async load(id: number) {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);

      const fav = await this.favoritesService.getById(id);
      this.favorite.set(fav);

      // cargar info del pokemon desde PokéAPI
      this.loadPokemon(fav.pokemon_id);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando el favorito.');
    } finally {
      this.loading.set(false);
    }
  }

  loadPokemon(pokemonId: number) {
    this.pokemonLoading.set(true);

    this.pokemonService.getPokemonById(pokemonId).subscribe({
      next: (p) => {
        this.pokemon.set(p);
        this.pokemonLoading.set(false);
      },
      error: () => {
        this.pokemon.set(null);
        this.pokemonLoading.set(false);
      }
    });
  }

  async remove() {
    const fav = this.favorite();
    if (!fav) return;

    const ok = confirm(`¿Eliminar el favorito #${fav.id} (Pokémon ${fav.pokemon_name})?`);
    if (!ok) return;

    try {
      await this.favoritesService.delete(fav.id);
      await this.router.navigate(['/favorites']);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error eliminando favorito.');
    }
  }

}
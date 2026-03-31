import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, switchMap } from 'rxjs';
import { PokemonDetail, PokemonListResponse } from '../../../shared/models/pokemon.model';

export type PokemonSearchIndexItem = {
  id: number;
  name: string;
};

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private baseUrl = 'https://pokeapi.co/api/v2';
  private pokemonSearchIndex$: Observable<PokemonSearchIndexItem[]> | null = null;

  constructor(private http: HttpClient) {}

  /** Obtiene listado paginado de Pokemon */
  getPokemons(limit = 20, offset = 0): Observable<PokemonListResponse> {
    return this.http.get<PokemonListResponse>(`${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`);
  }

  /** Obtiene detalle por id o nombre */
  getPokemonById(id: string | number): Observable<PokemonDetail> {
    return this.http.get<PokemonDetail>(`${this.baseUrl}/pokemon/${id}`);
  }

  /** Indice global cacheado para busquedas parciales */
  getPokemonSearchIndex(): Observable<PokemonSearchIndexItem[]> {
    if (!this.pokemonSearchIndex$) {
      this.pokemonSearchIndex$ = this.getPokemons(1, 0).pipe(
        switchMap((firstPage) => this.getPokemons(firstPage.count, 0)),
        map((res) =>
          res.results.map((p) => ({
            id: this.getIdFromUrl(p.url),
            name: p.name
          }))
        ),
        shareReplay(1)
      );
    }

    return this.pokemonSearchIndex$;
  }

  private getIdFromUrl(url: string): number {
    const parts = url.split('/').filter(Boolean);
    return Number(parts[parts.length - 1]);
  }
}

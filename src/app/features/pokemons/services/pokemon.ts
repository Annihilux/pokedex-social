import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, throwError } from 'rxjs';
import { PokemonDetail, PokemonListResponse } from '../../../shared/models/pokemon.model';

const MAX_POKEMON_ID = 1025;

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private baseUrl = 'https://pokeapi.co/api/v2';
  readonly maxPokemonId = MAX_POKEMON_ID;

  constructor(private http: HttpClient) {}

  /** Obtiene listado paginado de Pokemon */
  getPokemons(limit = 20, offset = 0): Observable<PokemonListResponse> {
    const safeOffset = this.normalizePositiveInteger(offset, 0);

    if (safeOffset >= this.maxPokemonId) {
      return of({
        count: this.maxPokemonId,
        next: null,
        previous: null,
        results: []
      });
    }

    const requestedLimit = this.normalizePositiveInteger(limit, 20);
    const safeLimit = Math.min(requestedLimit, this.maxPokemonId - safeOffset);

    return this.http
      .get<PokemonListResponse>(`${this.baseUrl}/pokemon?limit=${safeLimit}&offset=${safeOffset}`)
      .pipe(
        map((response) => ({
          ...response,
          count: this.maxPokemonId
        }))
      );
  }

  /** Obtiene detalle por id o nombre */
  getPokemonById(id: string | number): Observable<PokemonDetail> {
    const normalized = String(id ?? '').trim().toLowerCase();
    if (!normalized) {
      return throwError(() => new Error('Pokemon invalido.'));
    }

    const numericId = Number(normalized);
    const isIntegerId = Number.isInteger(numericId) && numericId > 0;

    if (isIntegerId && numericId > this.maxPokemonId) {
      return throwError(() => new Error(`Solo hay ${this.maxPokemonId} Pokemons disponibles.`));
    }

    const requestId = isIntegerId ? numericId : normalized;

    return this.http.get<PokemonDetail>(`${this.baseUrl}/pokemon/${requestId}`).pipe(
      map((pokemon) => {
        if (pokemon.id > this.maxPokemonId) {
          throw new Error(`Solo hay ${this.maxPokemonId} Pokemons disponibles.`);
        }

        return pokemon;
      })
    );
  }

  private normalizePositiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }
}

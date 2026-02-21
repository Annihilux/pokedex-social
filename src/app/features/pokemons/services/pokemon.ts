import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PokemonDetail, PokemonListResponse } from '../../../shared/models/pokemon.model';

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private baseUrl = 'https://pokeapi.co/api/v2';

  constructor(private http: HttpClient) {}

  /** Obtiene listado paginado de Pokémon */
  getPokemons(limit = 20, offset = 0): Observable<PokemonListResponse> {
    return this.http.get<PokemonListResponse>(`${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`);
  }

  /** Obtiene detalle por id o nombre */
  getPokemonById(id: string | number): Observable<PokemonDetail> {
    return this.http.get<PokemonDetail>(`${this.baseUrl}/pokemon/${id}`);
  }
}
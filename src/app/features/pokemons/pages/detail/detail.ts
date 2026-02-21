import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PokemonService } from '../../services/pokemon';
import { PokemonDetail } from '../../../../shared/models/pokemon.model';

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
  pokemon = signal<PokemonDetail | null>(null);

  constructor(private route: ActivatedRoute, private pokemonService: PokemonService) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
    else {
      this.errorMsg.set('ID inválido.');
      this.loading.set(false);
    }
  }

  load(id: string) {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.pokemonService.getPokemonById(id).subscribe({
      next: (p) => {
        this.pokemon.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el Pokémon.');
        this.loading.set(false);
      }
    });
  }
}
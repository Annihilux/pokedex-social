import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AvatarService } from '../../../../core/services/avatar';
import { PokemonService } from '../../services/pokemon';
import { PokemonDetail } from '../../../../shared/models/pokemon.model';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { CommentService } from '../../../comments/services/comment';
import { Comment } from '../../../../shared/models/comment.model';
import { FavoriteService } from '../../../favorites/services/favorite';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './detail.html',
  styleUrl: './detail.scss'
})
export class DetailComponent {
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  pokemon = signal<PokemonDetail | null>(null);

  commentsLoading = signal(false);
  commentsError = signal<string | null>(null);
  comments = signal<Comment[]>([]);
  commentSaving = signal(false);
  commentError = signal<string | null>(null);
  favoriteBusy = signal(false);
  favoriteError = signal<string | null>(null);
  isFavorite = signal(false);
  favoritesCount = signal(0);
  commentForm!: FormGroup;

  editingCommentId = signal<number | null>(null);
  editError = signal<string | null>(null);

  editForm!: FormGroup;

  private pokemonId!: number;

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService,
    private fb: FormBuilder,
    public auth: AuthService,
    public avatar: AvatarService,
    private commentService: CommentService,
    private favoriteService: FavoriteService
  ) {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.editForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(2)]]
    });

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
    this.favoritesCount.set(0);

    this.pokemonService.getPokemonById(id).subscribe({
      next: (p) => {
        this.pokemon.set(p);
        this.pokemonId = p.id;
        this.loadComments(p.id);
        void this.refreshFavoriteState();
        void this.refreshFavoritesCount();
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el Pokémon.');
        this.loading.set(false);
      }
    });
  }

  async loadComments(pokemonId: number) {
    try {
      this.commentsLoading.set(true);
      this.commentsError.set(null);
      const list = await this.commentService.getByPokemonId(pokemonId);
      this.comments.set(list);
    } catch (e: any) {
      this.commentsError.set(e?.message ?? 'Error cargando comentarios.');
    } finally {
      this.commentsLoading.set(false);
    }
  }

  async submitComment() {
    this.commentError.set(null);

    if (!this.auth.isAuthenticated()) {
      this.commentError.set('Debes iniciar sesión para comentar.');
      return;
    }

    if (this.commentForm.invalid) {
      this.commentError.set('Escribe un comentario válido.');
      return;
    }

    const userId = this.auth.user()?.id;
    if (!userId) {
      this.commentError.set('Sesión no válida.');
      return;
    }

    try {
      this.commentSaving.set(true);

      const payload = {
        user_id: userId,
        pokemon_id: this.pokemonId,
        content: String(this.commentForm.value.content).trim()
      };

      await this.commentService.create(payload);
      this.commentForm.reset({ content: '' });

      await this.loadComments(this.pokemonId);
    } catch (e: any) {
      this.commentError.set(e?.message ?? 'Error creando comentario.');
    } finally {
      this.commentSaving.set(false);
    }
  }

  startEdit(c: Comment) {
    this.editError.set(null);
    this.editingCommentId.set(c.id);
    this.editForm.patchValue({ content: c.content });
  }

  cancelEdit() {
    this.editingCommentId.set(null);
    this.editError.set(null);
  }

  canManageComment(c: Comment): boolean {
    const myId = this.auth.user()?.id;
    return this.auth.isAdmin() || (!!myId && c.user_id === myId);
  }

  async saveEdit(c: Comment) {
    this.editError.set(null);

    if (!this.canManageComment(c)) {
      this.editError.set('No tienes permisos para editar este comentario.');
      return;
    }

    if (this.editForm.invalid) {
      this.editError.set('Comentario inválido.');
      return;
    }

    try {
      const content = String(this.editForm.value.content).trim();
      await this.commentService.update(c.id, { content });
      this.editingCommentId.set(null);
      await this.loadComments(this.pokemonId);
    } catch (e: any) {
      this.editError.set(e?.message ?? 'Error editando comentario.');
    }
  }

  async removeComment(c: Comment) {
    if (!this.canManageComment(c)) {
      alert('No tienes permisos para borrar este comentario.');
      return;
    }

    const ok = confirm('¿Eliminar este comentario?');
    if (!ok) return;

    try {
      await this.commentService.delete(c.id);
      await this.loadComments(this.pokemonId);
    } catch (e: any) {
      alert(e?.message ?? 'Error eliminando comentario.');
    }
  }

  commentUsername(comment: Comment): string {
    return comment.username?.trim() || 'usuario';
  }

  async toggleFavorite() {
    this.favoriteError.set(null);

    if (!this.auth.isAuthenticated()) {
      this.favoriteError.set('Debes iniciar sesion para gestionar favoritos.');
      return;
    }

    try {
      this.favoriteBusy.set(true);

      if (this.isFavorite()) {
        await this.favoriteService.removeFavorite(this.pokemonId);
        this.isFavorite.set(false);
      } else {
        await this.favoriteService.addFavorite(this.pokemonId);
        this.isFavorite.set(true);
      }

      await this.refreshFavoritesCount();
    } catch (e: any) {
      this.favoriteError.set(e?.message ?? 'Error actualizando favorito.');
    } finally {
      this.favoriteBusy.set(false);
    }
  }

  private async refreshFavoriteState() {
    if (!this.auth.isAuthenticated()) {
      this.isFavorite.set(false);
      return;
    }

    try {
      const result = await this.favoriteService.isFavorite(this.pokemonId);
      this.isFavorite.set(result);
    } catch {
      this.isFavorite.set(false);
    }
  }

  private async refreshFavoritesCount() {
    try {
      const count = await this.favoriteService.getPokemonFavoritesCount(this.pokemonId);
      this.favoritesCount.set(count);
    } catch {
      this.favoritesCount.set(0);
    }
  }

}

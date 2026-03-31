import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AvatarService } from '../../../../core/services/avatar';

import { FavoriteService } from '../../../favorites/services/favorite';
import { CommentService } from '../../../comments/services/comment';

import { Favorite } from '../../../../shared/models/favorite.model';
import { Comment } from '../../../../shared/models/comment.model';

@Component({
  selector: 'app-manage-content',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './manage-content.html',
  styleUrl: './manage-content.scss'
})
export class ManageContentComponent {
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  favorites = signal<Favorite[]>([]);
  comments = signal<Comment[]>([]);

  constructor(
    public avatar: AvatarService,
    private favoritesService: FavoriteService,
    private commentService: CommentService
  ) {
    this.load();
  }

  async load() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);

      const [favs, comms] = await Promise.all([
        this.favoritesService.getAllGlobal(),
        this.commentService.getAllGlobal()
      ]);

      this.favorites.set(favs);
      this.comments.set(comms);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando contenido.');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteFavorite(f: Favorite) {
    const ok = confirm(`¿Eliminar favorito #${f.id} (${f.pokemon_name})?`);
    if (!ok) return;

    try {
      await this.favoritesService.delete(f.id);
      await this.load();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error eliminando favorito.');
    }
  }

  async deleteComment(c: Comment) {
    const ok = confirm('¿Eliminar este comentario?');
    if (!ok) return;

    try {
      await this.commentService.delete(c.id);
      await this.load();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error eliminando comentario.');
    }
  }

  commentUsername(comment: Comment): string {
    return comment.username?.trim() || 'usuario';
  }
}

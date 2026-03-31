import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AvatarService } from '../../../../core/services/avatar';
import { CommentService } from '../../../comments/services/comment';
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
  comments = signal<Comment[]>([]);

  constructor(
    public avatar: AvatarService,
    private commentService: CommentService
  ) {
    this.load();
  }

  async load() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);
      const comms = await this.commentService.getAllGlobal();
      this.comments.set(comms);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando contenido.');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteComment(c: Comment) {
    const ok = confirm('Eliminar este comentario?');
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

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../core/services/user';
import { Profile } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.scss'
})
export class UsersComponent {
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  users = signal<Profile[]>([]);

  savingId = signal<string | null>(null);

  constructor(private usersService: UserService) {
    this.load();
  }

  async load() {
    try {
      this.loading.set(true);
      this.errorMsg.set(null);
      const list = await this.usersService.getAllProfiles();
      this.users.set(list);
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error cargando usuarios.');
    } finally {
      this.loading.set(false);
    }
  }

  async setRole(u: Profile, role: 'user' | 'admin') {
    try {
      this.savingId.set(u.user_id);
      await this.usersService.updateRole(u.user_id, role);
      await this.load();
    } catch (e: any) {
      this.errorMsg.set(e?.message ?? 'Error actualizando rol.');
    } finally {
      this.savingId.set(null);
    }
  }
}
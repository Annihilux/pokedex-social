import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AvatarService } from '../../../core/services/avatar';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  constructor(
    public auth: AuthService,
    public avatar: AvatarService,
    private router: Router
  ) {}

  async logout() {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}

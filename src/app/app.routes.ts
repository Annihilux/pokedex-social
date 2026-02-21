import { Routes } from '@angular/router';

import { HomeComponent } from './features/home/pages/home/home';
import { LoginComponent } from './features/auth/pages/login/login';
import { RegisterComponent } from './features/auth/pages/register/register';
import { NotFoundComponent } from './features/error/pages/not-found/not-found';

import { ListComponent as PokemonListComponent } from './features/pokemons/pages/list/list';
import { DetailComponent as PokemonDetailComponent } from './features/pokemons/pages/detail/detail';

import { ListComponent as FavoritesListComponent } from './features/favorites/pages/list/list';
import { CreateComponent as FavoritesCreateComponent } from './features/favorites/pages/create/create';
import { EditComponent as FavoritesEditComponent } from './features/favorites/pages/edit/edit';
import { DetailComponent as FavoritesDetailComponent } from './features/favorites/pages/detail/detail';

import { UsersComponent } from './features/admin/pages/users/users';
import { ManageContentComponent } from './features/admin/pages/manage-content/manage-content';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

import { DashboardComponent } from './features/dashboard/pages/dashboard/dashboard.component';

export const routes: Routes = [

  // Públicas
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Pokémons (público)
  { path: 'pokemons', component: PokemonListComponent },
  { path: 'pokemons/:id', component: PokemonDetailComponent },

  // Favoritos (requiere login)
  { path: 'favorites', component: FavoritesListComponent, canActivate: [authGuard] },
  { path: 'favorites/create', component: FavoritesCreateComponent, canActivate: [authGuard] },
  { path: 'favorites/:id', component: FavoritesDetailComponent, canActivate: [authGuard] },
  { path: 'favorites/edit/:id', component: FavoritesEditComponent, canActivate: [authGuard, roleGuard] },

  // Admin
  { path: 'admin/users', component: UsersComponent, canActivate: [authGuard, roleGuard] },
  { path: 'admin/content', component: ManageContentComponent, canActivate: [authGuard, roleGuard] },

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  // 404
  { path: '**', component: NotFoundComponent }

];
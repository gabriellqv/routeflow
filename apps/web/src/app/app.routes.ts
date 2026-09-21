import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

/**
 * Rotas da aplicação.
 *
 * A área autenticada usa o `Shell` como layout e é protegida pelo `authGuard`.
 * As features de CRUD, mapa e simulação entram nos próximos PRs da Fase 5.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((module) => module.Login),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell').then((module) => module.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'map' },
      {
        path: 'map',
        loadComponent: () =>
          import('./features/placeholder/placeholder').then((module) => module.Placeholder),
        data: { title: 'Mapa em tempo real' },
      },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('./features/placeholder/placeholder').then((module) => module.Placeholder),
        data: { title: 'Veículos' },
      },
      {
        path: 'drivers',
        loadComponent: () =>
          import('./features/placeholder/placeholder').then((module) => module.Placeholder),
        data: { title: 'Motoristas' },
      },
      {
        path: 'routes',
        loadComponent: () =>
          import('./features/placeholder/placeholder').then((module) => module.Placeholder),
        data: { title: 'Rotas' },
      },
      {
        path: 'deliveries',
        loadComponent: () =>
          import('./features/placeholder/placeholder').then((module) => module.Placeholder),
        data: { title: 'Entregas' },
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./features/placeholder/placeholder').then((module) => module.Placeholder),
        data: { title: 'Manutenções' },
      },
      {
        path: 'simulation',
        loadComponent: () =>
          import('./features/placeholder/placeholder').then((module) => module.Placeholder),
        data: { title: 'Simulação' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

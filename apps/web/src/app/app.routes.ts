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
        loadComponent: () => import('./features/map/map').then((module) => module.MapView),
      },
      {
        path: 'vehicles',
        loadComponent: () =>
          import('./features/vehicles/vehicles').then((module) => module.Vehicles),
      },
      {
        path: 'drivers',
        loadComponent: () => import('./features/drivers/drivers').then((module) => module.Drivers),
      },
      {
        path: 'routes',
        loadComponent: () => import('./features/routes/routes').then((module) => module.Routes),
      },
      {
        path: 'deliveries',
        loadComponent: () =>
          import('./features/deliveries/deliveries').then((module) => module.Deliveries),
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./features/maintenance/maintenance').then((module) => module.Maintenance),
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

import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

/** Item de navegação exibido na barra lateral. */
interface NavItem {
  label: string;
  path: string;
}

/**
 * Layout principal da aplicação autenticada.
 *
 * Compõe a barra lateral de navegação, a barra superior e a área de conteúdo
 * (`router-outlet`).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Itens do menu lateral. */
  protected readonly navItems: NavItem[] = [
    { label: 'Mapa', path: '/map' },
    { label: 'Veículos', path: '/vehicles' },
    { label: 'Motoristas', path: '/drivers' },
    { label: 'Rotas', path: '/routes' },
    { label: 'Entregas', path: '/deliveries' },
    { label: 'Manutenções', path: '/maintenance' },
    { label: 'Simulação', path: '/simulation' },
  ];

  /** Encerra a sessão e volta para a tela de login. */
  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}

import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Página provisória para as features ainda não implementadas.
 *
 * Exibe o título definido nos dados da rota e antecipa o próximo PR da Fase 5.
 */
@Component({
  selector: 'app-placeholder',
  template: `
    <section class="placeholder">
      <h2 class="placeholder__title">{{ title }}</h2>
      <p class="placeholder__text">
        Esta área será implementada no próximo PR da Fase 5 (CRUD, mapa e controle da simulação).
      </p>
    </section>
  `,
  styles: `
    .placeholder {
      padding: 2rem;
      border-radius: 0.75rem;
      background: #fff;
      border: 1px dashed #cbd5e1;
    }

    .placeholder__title {
      margin: 0 0 0.5rem;
      color: #0f172a;
      font-size: 1.125rem;
    }

    .placeholder__text {
      margin: 0;
      color: #64748b;
      font-size: 0.9375rem;
    }
  `,
})
export class Placeholder {
  private readonly route = inject(ActivatedRoute);

  /** Título da página, lido dos dados da rota. */
  protected readonly title = (this.route.snapshot.data['title'] as string) ?? 'Em breve';
}

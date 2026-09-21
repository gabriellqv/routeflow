import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/**
 * Página de login.
 *
 * Autentica o usuário via `POST /api/auth/login` e, em caso de sucesso,
 * redireciona para a URL solicitada (ou para o mapa).
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Mensagem de erro exibida quando o login falha. */
  protected readonly error = signal<string | null>(null);

  /** Indica que a requisição de login está em andamento. */
  protected readonly loading = signal(false);

  /** Formulário reativo de credenciais. */
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  /**
   * Valida o formulário e tenta autenticar o usuário.
   */
  protected async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      await this.authService.login(email, password);

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/map';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Falha ao autenticar');
    } finally {
      this.loading.set(false);
    }
  }
}

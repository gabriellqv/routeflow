import { signal } from '@angular/core';
import { ResourceService } from './resource.service';

/**
 * Base reutilizável para telas de CRUD.
 *
 * Mantém o estado reativo (signals) de lista, carregamento e erro, e expõe as
 * ações comuns (`reload`, `remove`). As telas concretas estendem esta classe e
 * informam o `ResourceService` correspondente.
 */
export abstract class CrudBase<TResponse, TCreate, TUpdate> {
  /** Serviço do recurso manipulado pela tela. */
  protected abstract readonly resource: ResourceService<TResponse, TCreate, TUpdate>;

  private readonly itemsSignal = signal<TResponse[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  /** Registros carregados. */
  readonly items = this.itemsSignal.asReadonly();

  /** Indica carregamento em andamento. */
  readonly loading = this.loadingSignal.asReadonly();

  /** Mensagem de erro do último carregamento, se houver. */
  readonly error = this.errorSignal.asReadonly();

  /**
   * Recarrega a lista de registros.
   */
  async reload(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      this.itemsSignal.set(await this.resource.list());
    } catch (error) {
      this.errorSignal.set(error instanceof Error ? error.message : 'Falha ao carregar os dados');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Remove um registro e recarrega a lista.
   *
   * @param id Identificador do registro.
   */
  async remove(id: string): Promise<void> {
    this.errorSignal.set(null);

    try {
      await this.resource.remove(id);
      await this.reload();
    } catch (error) {
      this.errorSignal.set(error instanceof Error ? error.message : 'Falha ao remover');
    }
  }
}

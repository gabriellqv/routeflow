import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Serviço base para recursos REST do RouteFlow.
 *
 * Encapsula as operações de listar, criar, atualizar e remover um recurso,
 * padronizando o caminho do endpoint e os tipos de DTO/response. As features
 * estendem esta classe informando o endpoint e os tipos específicos.
 */
@Injectable()
export abstract class ResourceService<TResponse, TCreate, TUpdate> {
  /** Serviço HTTP da API. */
  protected readonly api = inject(ApiService);

  /** Caminho relativo do recurso (ex.: `/api/vehicles`). */
  protected abstract readonly path: string;

  /**
   * Lista todos os registros do recurso.
   *
   * @returns Promise com a lista tipada.
   */
  list(): Promise<TResponse[]> {
    return firstValueFrom(this.api.get<TResponse[]>(this.path));
  }

  /**
   * Busca um registro pelo identificador.
   *
   * @param id Identificador do registro.
   * @returns Promise com o registro.
   */
  findById(id: string): Promise<TResponse> {
    return firstValueFrom(this.api.get<TResponse>(`${this.path}/${id}`));
  }

  /**
   * Cria um novo registro.
   *
   * @param dto Dados de criação.
   * @returns Promise com o registro criado.
   */
  create(dto: TCreate): Promise<TResponse> {
    return firstValueFrom(this.api.post<TResponse>(this.path, dto));
  }

  /**
   * Atualiza parcialmente um registro.
   *
   * @param id Identificador do registro.
   * @param dto Campos a atualizar.
   * @returns Promise com o registro atualizado.
   */
  update(id: string, dto: TUpdate): Promise<TResponse> {
    return firstValueFrom(this.api.patch<TResponse>(`${this.path}/${id}`, dto));
  }

  /**
   * Remove um registro.
   *
   * @param id Identificador do registro.
   * @returns Promise resolvida quando a remoção termina.
   */
  remove(id: string): Promise<void> {
    const request$: Observable<unknown> = this.api.delete(`${this.path}/${id}`);
    return firstValueFrom(request$).then(() => undefined);
  }
}

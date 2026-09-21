import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DeliveryStatus, type DeliveryDto, type RouteDto } from '@routeflow/contracts';
import { CrudBase } from '../../core/crud-base';
import {
  DeliveriesService,
  type CreateDeliveryInput,
  type UpdateDeliveryInput,
} from './deliveries.service';

/**
 * Tela de CRUD de entregas.
 *
 * Lista as entregas, permite criar, editar e remover, informando a rota, a
 * ordem, o endereço e a geolocalização (GeoJSON Point).
 */
@Component({
  selector: 'app-deliveries',
  imports: [ReactiveFormsModule],
  templateUrl: './deliveries.html',
  styleUrl: './deliveries.css',
})
export class Deliveries
  extends CrudBase<DeliveryDto, CreateDeliveryInput, UpdateDeliveryInput>
  implements OnInit
{
  protected readonly resource = inject(DeliveriesService);
  private readonly formBuilder = inject(FormBuilder);

  /** Status disponíveis. */
  protected readonly statuses = Object.values(DeliveryStatus);

  /** Rotas disponíveis para seleção. */
  protected readonly routes = signal<RouteDto[]>([]);

  /** Identificador em edição (`null` quando criando). */
  protected readonly editingId = signal<string | null>(null);

  /** Controla a exibição do formulário. */
  protected readonly formVisible = signal(false);

  /** Erro de submissão do formulário. */
  protected readonly formError = signal<string | null>(null);

  /** Indica envio em andamento. */
  protected readonly saving = signal(false);

  /** Formulário reativo da entrega. */
  protected readonly form = this.formBuilder.nonNullable.group({
    route_id: ['', [Validators.required]],
    order: [0, [Validators.required, Validators.min(0)]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    lng: [0, [Validators.required]],
    lat: [0, [Validators.required]],
    status: [DeliveryStatus.Pending],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reload(), this.loadRoutes()]);
  }

  /** Abre o formulário para criação. */
  protected openCreate(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      route_id: '',
      order: 0,
      address: '',
      lng: 0,
      lat: 0,
      status: DeliveryStatus.Pending,
    });
    this.formVisible.set(true);
  }

  /**
   * Abre o formulário preenchido para edição.
   *
   * @param delivery Entrega a editar.
   */
  protected openEdit(delivery: DeliveryDto): void {
    this.editingId.set(delivery.id);
    this.formError.set(null);
    this.form.reset({
      route_id: delivery.route_id,
      order: delivery.order,
      address: delivery.address,
      lng: delivery.geolocation.coordinates[0],
      lat: delivery.geolocation.coordinates[1],
      status: delivery.status,
    });
    this.formVisible.set(true);
  }

  /** Fecha o formulário. */
  protected closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  /** Salva a entrega (cria ou atualiza). */
  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      const geolocation = {
        type: 'Point' as const,
        coordinates: [value.lng, value.lat] as [number, number],
      };
      const id = this.editingId();

      if (id) {
        await this.resource.update(id, {
          order: value.order,
          address: value.address,
          geolocation,
          status: value.status,
        });
      } else {
        await this.resource.create({
          route_id: value.route_id,
          order: value.order,
          address: value.address,
          geolocation,
          status: value.status,
        });
      }

      this.closeForm();
      await this.reload();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'Falha ao salvar a entrega');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Remove uma entrega, se confirmado.
   *
   * @param delivery Entrega a remover.
   */
  protected async confirmRemove(delivery: DeliveryDto): Promise<void> {
    if (confirm(`Remover a entrega "${delivery.address}"?`)) {
      await this.remove(delivery.id);
    }
  }

  /**
   * Resolve o nome da rota associada.
   *
   * @param routeId Identificador da rota.
   * @returns Nome da rota ou um rótulo vazio.
   */
  protected routeName(routeId: string): string {
    return this.routes().find((route) => route.id === routeId)?.name ?? '—';
  }

  /** Carrega as rotas para o campo de seleção. */
  private async loadRoutes(): Promise<void> {
    try {
      this.routes.set(await this.resource.listRoutes());
    } catch {
      this.routes.set([]);
    }
  }
}

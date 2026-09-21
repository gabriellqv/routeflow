import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { RouteDto, VehicleDto, WaypointDto } from '@routeflow/contracts';
import { CrudBase } from '../../core/crud-base';
import { RoutesService, type CreateRouteInput, type UpdateRouteInput } from './routes.service';

/** Ponto em edição no formulário (coordenadas como texto). */
interface WaypointRow {
  lng: number;
  lat: number;
}

/**
 * Tela de CRUD de rotas.
 *
 * Permite criar/editar a rota informando nome, pontos do traçado (convertidos em
 * GeoJSON `LineString`), waypoints e o veículo atribuído.
 */
@Component({
  selector: 'app-routes',
  imports: [ReactiveFormsModule],
  templateUrl: './routes.html',
  styleUrl: './routes.css',
})
export class Routes
  extends CrudBase<RouteDto, CreateRouteInput, UpdateRouteInput>
  implements OnInit
{
  protected readonly resource = inject(RoutesService);
  private readonly formBuilder = inject(FormBuilder);

  /** Veículos disponíveis para atribuição. */
  protected readonly vehicles = signal<VehicleDto[]>([]);

  /** Traçado (line string) em edição. */
  protected readonly coordinates = signal<WaypointRow[]>([]);

  /** Ponto atual sendo adicionado ao traçado. */
  protected readonly newPoint = signal<WaypointRow>({ lng: 0, lat: 0 });

  /** Identificador em edição (`null` quando criando). */
  protected readonly editingId = signal<string | null>(null);

  /** Controla a exibição do formulário. */
  protected readonly formVisible = signal(false);

  /** Erro de submissão do formulário. */
  protected readonly formError = signal<string | null>(null);

  /** Indica envio em andamento. */
  protected readonly saving = signal(false);

  /** Formulário reativo da rota. */
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    assigned_vehicle_id: [''],
    waypoint_lng: [0],
    waypoint_lat: [0],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reload(), this.loadVehicles()]);
  }

  /** Abre o formulário para criação. */
  protected openCreate(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.coordinates.set([]);
    this.form.reset({ name: '', assigned_vehicle_id: '', waypoint_lng: 0, waypoint_lat: 0 });
    this.formVisible.set(true);
  }

  /**
   * Abre o formulário preenchido para edição.
   *
   * @param route Rota a editar.
   */
  protected openEdit(route: RouteDto): void {
    this.editingId.set(route.id);
    this.formError.set(null);
    this.coordinates.set(route.geometry.coordinates.map(([lng, lat]) => ({ lng, lat })));
    this.form.reset({
      name: route.name,
      assigned_vehicle_id: route.assigned_vehicle_id ?? '',
      waypoint_lng: 0,
      waypoint_lat: 0,
    });
    this.formVisible.set(true);
  }

  /** Fecha o formulário. */
  protected closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
    this.coordinates.set([]);
  }

  /** Adiciona o ponto informado ao traçado. */
  protected addPoint(): void {
    const { waypoint_lng, waypoint_lat } = this.form.getRawValue();

    if (!Number.isFinite(waypoint_lng) || !Number.isFinite(waypoint_lat)) {
      return;
    }

    this.coordinates.update((points) => [...points, { lng: waypoint_lng, lat: waypoint_lat }]);
    this.form.patchValue({ waypoint_lng: 0, waypoint_lat: 0 });
  }

  /**
   * Remove um ponto do traçado.
   *
   * @param index Índice do ponto.
   */
  protected removePoint(index: number): void {
    this.coordinates.update((points) => points.filter((_, position) => position !== index));
  }

  /** Salva a rota (cria ou atualiza). */
  protected async save(): Promise<void> {
    const points = this.coordinates();

    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    if (points.length < 2) {
      this.formError.set('Informe ao menos dois pontos para o traçado da rota.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      const geometry = {
        type: 'LineString' as const,
        coordinates: points.map((point) => [point.lng, point.lat] as [number, number]),
      };
      const waypoints: WaypointDto[] = points.map((point) => ({ lng: point.lng, lat: point.lat }));
      const assignedVehicleId = value.assigned_vehicle_id === '' ? null : value.assigned_vehicle_id;

      const id = this.editingId();

      if (id) {
        await this.resource.update(id, {
          name: value.name,
          geometry,
          waypoints,
          assigned_vehicle_id: assignedVehicleId,
        });
      } else {
        await this.resource.create({
          name: value.name,
          geometry,
          waypoints,
          assigned_vehicle_id: assignedVehicleId ?? undefined,
        });
      }

      this.closeForm();
      await this.reload();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'Falha ao salvar a rota');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Remove uma rota, se confirmado.
   *
   * @param route Rota a remover.
   */
  protected async confirmRemove(route: RouteDto): Promise<void> {
    if (confirm(`Remover a rota ${route.name}?`)) {
      await this.remove(route.id);
    }
  }

  /**
   * Resolve a placa do veículo atribuído.
   *
   * @param vehicleId Identificador do veículo (ou `null`).
   * @returns Placa do veículo ou um rótulo vazio.
   */
  protected vehiclePlate(vehicleId: string | null): string {
    if (!vehicleId) {
      return '—';
    }

    return this.vehicles().find((vehicle) => vehicle.id === vehicleId)?.plate ?? '—';
  }

  /** Carrega os veículos para o campo de atribuição. */
  private async loadVehicles(): Promise<void> {
    try {
      this.vehicles.set(await this.resource.listVehicles());
    } catch {
      this.vehicles.set([]);
    }
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehicleStatus, VehicleType, type DriverDto, type VehicleDto } from '@routeflow/contracts';
import { CrudBase } from '../../core/crud-base';
import { VehiclesService } from './vehicles.service';
import type { CreateVehicleInput, UpdateVehicleInput } from './vehicles.service';
/**
 * Tela de CRUD de veículos.
 *
 * Lista os veículos, permite criar, editar e remover, e alocar um motorista.
 */
@Component({
  selector: 'app-vehicles',
  imports: [ReactiveFormsModule],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.css',
})
export class Vehicles
  extends CrudBase<VehicleDto, CreateVehicleInput, UpdateVehicleInput>
  implements OnInit
{
  protected readonly resource = inject(VehiclesService);
  private readonly formBuilder = inject(FormBuilder);

  /** Tipos de veículo disponíveis. */
  protected readonly vehicleTypes = Object.values(VehicleType);

  /** Status disponíveis para edição. */
  protected readonly vehicleStatuses = Object.values(VehicleStatus);

  /** Motoristas disponíveis para alocação. */
  protected readonly drivers = signal<DriverDto[]>([]);

  /** Identificador em edição (`null` quando criando). */
  protected readonly editingId = signal<string | null>(null);

  /** Controla a exibição do formulário. */
  protected readonly formVisible = signal(false);

  /** Erro de submissão do formulário. */
  protected readonly formError = signal<string | null>(null);

  /** Indica envio em andamento. */
  protected readonly saving = signal(false);

  /** Formulário reativo do veículo. */
  protected readonly form = this.formBuilder.nonNullable.group({
    plate: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(10)]],
    type: [VehicleType.Truck, [Validators.required]],
    model: ['', [Validators.required, Validators.maxLength(120)]],
    capacity_kg: [0, [Validators.required, Validators.min(0)]],
    status: [VehicleStatus.Idle],
    driver_id: [''],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reload(), this.loadDrivers()]);
  }

  /**
   * Abre o formulário para criação de um veículo.
   */
  protected openCreate(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      plate: '',
      type: VehicleType.Truck,
      model: '',
      capacity_kg: 0,
      status: VehicleStatus.Idle,
      driver_id: '',
    });
    this.formVisible.set(true);
  }

  /**
   * Abre o formulário preenchido para edição.
   *
   * @param vehicle Veículo a editar.
   */
  protected openEdit(vehicle: VehicleDto): void {
    this.editingId.set(vehicle.id);
    this.formError.set(null);
    this.form.reset({
      plate: vehicle.plate,
      type: vehicle.type,
      model: vehicle.model,
      capacity_kg: vehicle.capacity_kg,
      status: vehicle.status,
      driver_id: vehicle.driver_id ?? '',
    });
    this.formVisible.set(true);
  }

  /** Fecha o formulário. */
  protected closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  /**
   * Salva o veículo (cria ou atualiza).
   */
  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      const payload = {
        plate: value.plate,
        type: value.type,
        model: value.model,
        capacity_kg: value.capacity_kg,
        status: value.status,
        driver_id: value.driver_id === '' ? null : value.driver_id,
      };

      const id = this.editingId();

      if (id) {
        await this.resource.update(id, {
          plate: payload.plate,
          type: payload.type,
          model: payload.model,
          capacity_kg: payload.capacity_kg,
          status: payload.status,
          driver_id: payload.driver_id,
        });
      } else {
        await this.resource.create({
          plate: payload.plate,
          type: payload.type,
          model: payload.model,
          capacity_kg: payload.capacity_kg,
          driver_id: payload.driver_id ?? undefined,
        });
      }

      this.closeForm();
      await this.reload();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'Falha ao salvar o veículo');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Verifica se um veículo está alocado a um motorista e remove, se confirmado.
   *
   * @param vehicle Veículo a remover.
   */
  protected async confirmRemove(vehicle: VehicleDto): Promise<void> {
    if (confirm(`Remover o veículo ${vehicle.plate}?`)) {
      await this.remove(vehicle.id);
    }
  }

  /**
   * Resolve o nome do motorista alocado.
   *
   * @param driverId Identificador do motorista (ou `null`).
   * @returns Nome do motorista ou um rótulo vazio.
   */
  protected driverName(driverId: string | null): string {
    if (!driverId) {
      return '—';
    }

    return this.drivers().find((driver) => driver.id === driverId)?.name ?? '—';
  }

  /**
   * Carrega os motoristas para o campo de alocação.
   */
  private async loadDrivers(): Promise<void> {
    try {
      this.drivers.set(await this.resource.listDrivers());
    } catch {
      this.drivers.set([]);
    }
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MaintenanceStatus,
  MaintenanceType,
  type MaintenanceDto,
  type VehicleDto,
} from '@routeflow/contracts';
import { CrudBase } from '../../core/crud-base';
import {
  MaintenanceService,
  type CreateMaintenanceInput,
  type UpdateMaintenanceInput,
} from './maintenance.service';

/**
 * Tela de CRUD de manutenções.
 *
 * Lista as manutenções, permite criar, editar e remover. O ciclo de vida
 * (`scheduled` → `in_progress` → `done`) é controlado pelo status.
 */
@Component({
  selector: 'app-maintenance',
  imports: [ReactiveFormsModule],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css',
})
export class Maintenance
  extends CrudBase<MaintenanceDto, CreateMaintenanceInput, UpdateMaintenanceInput>
  implements OnInit
{
  protected readonly resource = inject(MaintenanceService);
  private readonly formBuilder = inject(FormBuilder);

  /** Tipos de manutenção disponíveis. */
  protected readonly types = Object.values(MaintenanceType);

  /** Status disponíveis. */
  protected readonly statuses = Object.values(MaintenanceStatus);

  /** Veículos disponíveis para seleção. */
  protected readonly vehicles = signal<VehicleDto[]>([]);

  /** Identificador em edição (`null` quando criando). */
  protected readonly editingId = signal<string | null>(null);

  /** Controla a exibição do formulário. */
  protected readonly formVisible = signal(false);

  /** Erro de submissão do formulário. */
  protected readonly formError = signal<string | null>(null);

  /** Indica envio em andamento. */
  protected readonly saving = signal(false);

  /** Formulário reativo da manutenção. */
  protected readonly form = this.formBuilder.nonNullable.group({
    vehicle_id: ['', [Validators.required]],
    type: [MaintenanceType.Preventive, [Validators.required]],
    description: ['', [Validators.required, Validators.maxLength(255)]],
    status: [MaintenanceStatus.Scheduled],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reload(), this.loadVehicles()]);
  }

  /** Abre o formulário para criação. */
  protected openCreate(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      vehicle_id: '',
      type: MaintenanceType.Preventive,
      description: '',
      status: MaintenanceStatus.Scheduled,
    });
    this.formVisible.set(true);
  }

  /**
   * Abre o formulário preenchido para edição.
   *
   * @param maintenance Manutenção a editar.
   */
  protected openEdit(maintenance: MaintenanceDto): void {
    this.editingId.set(maintenance.id);
    this.formError.set(null);
    this.form.reset({
      vehicle_id: maintenance.vehicle_id,
      type: maintenance.type,
      description: maintenance.description,
      status: maintenance.status,
    });
    this.formVisible.set(true);
  }

  /** Fecha o formulário. */
  protected closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  /** Salva a manutenção (cria ou atualiza). */
  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      const id = this.editingId();

      if (id) {
        await this.resource.update(id, {
          type: value.type,
          description: value.description,
          status: value.status,
        });
      } else {
        await this.resource.create({
          vehicle_id: value.vehicle_id,
          type: value.type,
          description: value.description,
          status: value.status,
        });
      }

      this.closeForm();
      await this.reload();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'Falha ao salvar a manutenção');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Remove uma manutenção, se confirmado.
   *
   * @param maintenance Manutenção a remover.
   */
  protected async confirmRemove(maintenance: MaintenanceDto): Promise<void> {
    if (confirm(`Remover a manutenção "${maintenance.description}"?`)) {
      await this.remove(maintenance.id);
    }
  }

  /**
   * Resolve a placa do veículo associado.
   *
   * @param vehicleId Identificador do veículo.
   * @returns Placa do veículo ou um rótulo vazio.
   */
  protected vehiclePlate(vehicleId: string): string {
    return this.vehicles().find((vehicle) => vehicle.id === vehicleId)?.plate ?? '—';
  }

  /** Carrega os veículos para o campo de seleção. */
  private async loadVehicles(): Promise<void> {
    try {
      this.vehicles.set(await this.resource.listVehicles());
    } catch {
      this.vehicles.set([]);
    }
  }
}

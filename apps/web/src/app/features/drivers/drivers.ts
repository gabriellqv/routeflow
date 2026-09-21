import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { DriverDto, VehicleDto } from '@routeflow/contracts';
import { CrudBase } from '../../core/crud-base';
import { DriversService, type CreateDriverInput, type UpdateDriverInput } from './drivers.service';

/**
 * Tela de CRUD de motoristas.
 *
 * Lista os motoristas, permite criar, editar, remover e associar um veículo.
 */
@Component({
  selector: 'app-drivers',
  imports: [ReactiveFormsModule],
  templateUrl: './drivers.html',
  styleUrl: './drivers.css',
})
export class Drivers
  extends CrudBase<DriverDto, CreateDriverInput, UpdateDriverInput>
  implements OnInit
{
  protected readonly resource = inject(DriversService);
  private readonly formBuilder = inject(FormBuilder);

  /** Veículos disponíveis para associação. */
  protected readonly vehicles = signal<VehicleDto[]>([]);

  /** Identificador em edição (`null` quando criando). */
  protected readonly editingId = signal<string | null>(null);

  /** Controla a exibição do formulário. */
  protected readonly formVisible = signal(false);

  /** Erro de submissão do formulário. */
  protected readonly formError = signal<string | null>(null);

  /** Indica envio em andamento. */
  protected readonly saving = signal(false);

  /** Formulário reativo do motorista. */
  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    license_number: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    license_category: [
      '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(10)],
    ],
    vehicle_id: [''],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reload(), this.loadVehicles()]);
  }

  /** Abre o formulário para criação. */
  protected openCreate(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({ name: '', license_number: '', license_category: '', vehicle_id: '' });
    this.formVisible.set(true);
  }

  /**
   * Abre o formulário preenchido para edição.
   *
   * @param driver Motorista a editar.
   */
  protected openEdit(driver: DriverDto): void {
    this.editingId.set(driver.id);
    this.formError.set(null);
    this.form.reset({
      name: driver.name,
      license_number: driver.license_number,
      license_category: driver.license_category,
      vehicle_id: driver.vehicle_id ?? '',
    });
    this.formVisible.set(true);
  }

  /** Fecha o formulário. */
  protected closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  /** Salva o motorista (cria ou atualiza). */
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
        name: value.name,
        license_number: value.license_number,
        license_category: value.license_category,
        vehicle_id: value.vehicle_id === '' ? undefined : value.vehicle_id,
      };

      const id = this.editingId();
      await (id ? this.resource.update(id, payload) : this.resource.create(payload));

      this.closeForm();
      await this.reload();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'Falha ao salvar o motorista');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Remove um motorista, se confirmado.
   *
   * @param driver Motorista a remover.
   */
  protected async confirmRemove(driver: DriverDto): Promise<void> {
    if (confirm(`Remover o motorista ${driver.name}?`)) {
      await this.remove(driver.id);
    }
  }

  /**
   * Resolve a placa do veículo associado.
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

  /** Carrega os veículos para o campo de associação. */
  private async loadVehicles(): Promise<void> {
    try {
      this.vehicles.set(await this.resource.listVehicles());
    } catch {
      this.vehicles.set([]);
    }
  }
}

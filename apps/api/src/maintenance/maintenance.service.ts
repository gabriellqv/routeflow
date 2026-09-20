import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceStatus, VehicleStatus } from '@routeflow/contracts';
import { toMaintenanceResponse } from '../common/mappers.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { MaintenanceResponseDto } from './dto/maintenance-response.dto.js';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto.js';
import { Maintenance } from './maintenance.entity.js';

/**
 * Serviço de manutenções.
 *
 * Concentra o CRUD e o ciclo de vida da manutenção. As transições de status
 * preenchem automaticamente as datas (`started_at`/`finished_at`) e refletem o
 * status do veículo (`maintenance` durante a execução, `idle` ao concluir).
 */
@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance) private readonly repository: Repository<Maintenance>,
    @InjectRepository(Vehicle) private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  /**
   * Lista todas as manutenções, opcionalmente filtradas por veículo.
   *
   * @param vehicleId Identificador do veículo para filtrar (opcional).
   * @returns Manutenções convertidas para o DTO de resposta.
   */
  async findAll(vehicleId?: string): Promise<MaintenanceResponseDto[]> {
    const maintenances = await this.repository.find({
      where: vehicleId ? { vehicleId } : {},
      order: { createdAt: 'DESC' },
    });
    return maintenances.map(toMaintenanceResponse);
  }

  /**
   * Busca uma manutenção pelo identificador.
   *
   * @param id Identificador da manutenção.
   * @returns DTO de resposta da manutenção.
   * @throws NotFoundException Quando a manutenção não existe.
   */
  async findOne(id: string): Promise<MaintenanceResponseDto> {
    return toMaintenanceResponse(await this.getOrFail(id));
  }

  /**
   * Cria uma nova manutenção.
   *
   * @param dto Dados de criação.
   * @returns DTO de resposta da manutenção criada.
   * @throws NotFoundException Quando o veículo não existe.
   * @throws BadRequestException Quando o status inicial é inválido.
   */
  async create(dto: CreateMaintenanceDto): Promise<MaintenanceResponseDto> {
    const vehicle = await this.getVehicleOrFail(dto.vehicle_id);

    const maintenance = this.repository.create({
      vehicleId: dto.vehicle_id,
      type: dto.type,
      description: dto.description,
      status: MaintenanceStatus.Scheduled,
    });

    await this.repository.save(maintenance);

    if (dto.status !== undefined && dto.status !== MaintenanceStatus.Scheduled) {
      await this.applyStatus(maintenance, vehicle, dto.status);
      await this.repository.save(maintenance);
    }

    return this.findOne(maintenance.id);
  }

  /**
   * Atualiza parcialmente uma manutenção.
   *
   * @param id Identificador da manutenção.
   * @param dto Campos a atualizar.
   * @returns DTO de resposta da manutenção atualizada.
   * @throws NotFoundException Quando a manutenção não existe.
   * @throws BadRequestException Quando a transição de status é inválida.
   */
  async update(id: string, dto: UpdateMaintenanceDto): Promise<MaintenanceResponseDto> {
    const maintenance = await this.getOrFail(id);

    if (dto.type !== undefined) maintenance.type = dto.type;
    if (dto.description !== undefined) maintenance.description = dto.description;

    if (dto.status !== undefined && dto.status !== maintenance.status) {
      if (maintenance.status === MaintenanceStatus.Done) {
        throw new BadRequestException('Manutenção concluída não pode mudar de status');
      }
      const vehicle = await this.getVehicleOrFail(maintenance.vehicleId);
      await this.applyStatus(maintenance, vehicle, dto.status);
    }

    await this.repository.save(maintenance);
    return this.findOne(id);
  }

  /**
   * Remove uma manutenção.
   *
   * @param id Identificador da manutenção.
   * @throws NotFoundException Quando a manutenção não existe.
   */
  async remove(id: string): Promise<void> {
    const maintenance = await this.getOrFail(id);
    await this.repository.remove(maintenance);
  }

  /**
   * Busca a entidade da manutenção ou lança `NotFoundException`.
   *
   * @param id Identificador da manutenção.
   * @returns A entidade da manutenção.
   * @throws NotFoundException Quando a manutenção não existe.
   */
  private async getOrFail(id: string): Promise<Maintenance> {
    const maintenance = await this.repository.findOne({ where: { id } });
    if (!maintenance) {
      throw new NotFoundException('Manutenção não encontrada');
    }
    return maintenance;
  }

  /**
   * Busca a entidade do veículo ou lança `NotFoundException`.
   *
   * @param vehicleId Identificador do veículo.
   * @returns A entidade do veículo.
   * @throws NotFoundException Quando o veículo não existe.
   */
  private async getVehicleOrFail(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    return vehicle;
  }

  /**
   * Aplica uma transição de status à manutenção e reflete no veículo.
   *
   * Regras:
   * - `scheduled` → `in_progress`: define `started_at` e veículo em `maintenance`.
   * - `scheduled` → `done`: define `started_at` e `finished_at`.
   * - `in_progress` → `done`: define `finished_at` e libera o veículo (`idle`).
   * - Não é permitido sair de `done`.
   *
   * @param maintenance Entidade da manutenção.
   * @param vehicle Veículo associado.
   * @param status Novo status desejado.
   * @throws BadRequestException Quando a transição é inválida.
   */
  private async applyStatus(
    maintenance: Maintenance,
    vehicle: Vehicle,
    status: MaintenanceStatus,
  ): Promise<void> {
    if (maintenance.status === MaintenanceStatus.Done) {
      throw new BadRequestException('Manutenção concluída não pode mudar de status');
    }

    if (status === MaintenanceStatus.Scheduled) {
      maintenance.status = MaintenanceStatus.Scheduled;
      return;
    }

    if (status === MaintenanceStatus.InProgress) {
      maintenance.status = MaintenanceStatus.InProgress;
      maintenance.startedAt = maintenance.startedAt ?? new Date();
      maintenance.finishedAt = null;

      vehicle.status = VehicleStatus.Maintenance;
      await this.vehicleRepository.save(vehicle);
      return;
    }

    if (status === MaintenanceStatus.Done) {
      maintenance.status = MaintenanceStatus.Done;
      maintenance.startedAt = maintenance.startedAt ?? new Date();
      maintenance.finishedAt = new Date();

      vehicle.status = VehicleStatus.Idle;
      await this.vehicleRepository.save(vehicle);
      return;
    }

    throw new BadRequestException('Transição de status inválida');
  }
}

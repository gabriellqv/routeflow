import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { toVehicleResponse } from '../common/mappers.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehicleResponseDto } from './dto/vehicle-response.dto.js';
import { Vehicle } from './vehicle.entity.js';

/**
 * Serviço de veículos.
 *
 * Concentra as regras de CRUD, a unicidade da placa e a alocação de motoristas.
 * A entidade `Vehicle` é a dona da relação 1—1 com `Driver` (coluna `driver_id`).
 */
@Injectable()
export class VehiclesService {
  constructor(@InjectRepository(Vehicle) private readonly repository: Repository<Vehicle>) {}

  /**
   * Lista todos os veículos.
   *
   * @returns Veículos convertidos para o DTO de resposta.
   */
  async findAll(): Promise<VehicleResponseDto[]> {
    const vehicles = await this.repository.find({ order: { createdAt: 'ASC' } });
    return vehicles.map(toVehicleResponse);
  }

  /**
   * Busca um veículo pelo identificador.
   *
   * @param id Identificador do veículo.
   * @returns DTO de resposta do veículo.
   * @throws NotFoundException Quando o veículo não existe.
   */
  async findOne(id: string): Promise<VehicleResponseDto> {
    return toVehicleResponse(await this.getOrFail(id));
  }

  /**
   * Cria um novo veículo.
   *
   * @param dto Dados de criação.
   * @returns DTO de resposta do veículo criado.
   * @throws ConflictException Quando a placa já está cadastrada.
   */
  async create(dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    await this.ensurePlateIsUnique(dto.plate);
    await this.releaseDriverFromOtherVehicles(dto.driver_id ?? null);

    const vehicle = this.repository.create({
      plate: dto.plate,
      type: dto.type,
      model: dto.model,
      capacityKg: String(dto.capacity_kg),
      driverId: dto.driver_id ?? null,
    });

    await this.repository.save(vehicle);
    return this.findOne(vehicle.id);
  }

  /**
   * Atualiza parcialmente um veículo.
   *
   * @param id Identificador do veículo.
   * @param dto Campos a atualizar.
   * @returns DTO de resposta do veículo atualizado.
   * @throws NotFoundException Quando o veículo não existe.
   * @throws ConflictException Quando a nova placa já está cadastrada.
   */
  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleResponseDto> {
    const vehicle = await this.getOrFail(id);

    if (dto.plate !== undefined && dto.plate !== vehicle.plate) {
      await this.ensurePlateIsUnique(dto.plate, id);
      vehicle.plate = dto.plate;
    }

    if (dto.type !== undefined) vehicle.type = dto.type;
    if (dto.model !== undefined) vehicle.model = dto.model;
    if (dto.capacity_kg !== undefined) vehicle.capacityKg = String(dto.capacity_kg);
    if (dto.status !== undefined) vehicle.status = dto.status;

    if (dto.driver_id !== undefined) {
      await this.releaseDriverFromOtherVehicles(dto.driver_id, id);
      vehicle.driverId = dto.driver_id;
    }

    await this.repository.save(vehicle);
    return this.findOne(id);
  }

  /**
   * Remove um veículo.
   *
   * @param id Identificador do veículo.
   * @throws NotFoundException Quando o veículo não existe.
   */
  async remove(id: string): Promise<void> {
    const vehicle = await this.getOrFail(id);
    await this.repository.remove(vehicle);
  }

  /**
   * Busca a entidade do veículo ou lança `NotFoundException`.
   *
   * @param id Identificador do veículo.
   * @returns A entidade do veículo.
   * @throws NotFoundException Quando o veículo não existe.
   */
  private async getOrFail(id: string): Promise<Vehicle> {
    const vehicle = await this.repository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    return vehicle;
  }

  /**
   * Garante que a placa não está em uso por outro veículo.
   *
   * @param plate Placa a verificar.
   * @param ignoreId Identificador a ignorar na verificação (na atualização).
   * @throws ConflictException Quando a placa já está cadastrada.
   */
  private async ensurePlateIsUnique(plate: string, ignoreId?: string): Promise<void> {
    const existing = await this.repository.findOne({ where: { plate } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Placa já cadastrada');
    }
  }

  /**
   * Remove a alocação do motorista de qualquer outro veículo.
   *
   * Mantém a relação 1—1: um motorista só pode estar associado a um veículo.
   *
   * @param driverId Identificador do motorista, ou `null` (nada a fazer).
   * @param keepVehicleId Veículo que deve manter a alocação, se houver.
   */
  private async releaseDriverFromOtherVehicles(
    driverId: string | null,
    keepVehicleId?: string,
  ): Promise<void> {
    if (driverId === null) {
      return;
    }

    const where = keepVehicleId ? { driverId, id: Not(keepVehicleId) } : { driverId };
    await this.repository.update(where, { driverId: null });
  }
}

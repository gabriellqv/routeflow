import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { toDriverResponse } from '../common/mappers.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { CreateDriverDto } from './dto/create-driver.dto.js';
import { DriverResponseDto } from './dto/driver-response.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { Driver } from './driver.entity.js';

/**
 * Serviço de motoristas.
 *
 * Concentra as regras de CRUD e a unicidade do número da CNH. A associação com
 * veículos é mantida em `Vehicle.driver_id` (lado dono da relação 1—1), então
 * o `vehicle_id` do DTO é aplicado diretamente sobre o veículo.
 */
@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly repository: Repository<Driver>,
    @InjectRepository(Vehicle) private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  /**
   * Lista todos os motoristas.
   *
   * @returns Motoristas convertidos para o DTO de resposta.
   */
  async findAll(): Promise<DriverResponseDto[]> {
    const drivers = await this.repository.find({
      relations: { vehicle: true },
      order: { createdAt: 'ASC' },
    });
    return drivers.map((driver) => toDriverResponse(driver, driver.vehicle?.id ?? null));
  }

  /**
   * Busca um motorista pelo identificador.
   *
   * @param id Identificador do motorista.
   * @returns DTO de resposta do motorista.
   * @throws NotFoundException Quando o motorista não existe.
   */
  async findOne(id: string): Promise<DriverResponseDto> {
    const driver = await this.getOrFail(id);
    return toDriverResponse(driver, driver.vehicle?.id ?? null);
  }

  /**
   * Cria um novo motorista.
   *
   * @param dto Dados de criação.
   * @returns DTO de resposta do motorista criado.
   * @throws ConflictException Quando o número da CNH já está cadastrado.
   */
  async create(dto: CreateDriverDto): Promise<DriverResponseDto> {
    await this.ensureLicenseIsUnique(dto.license_number);

    const driver = this.repository.create({
      name: dto.name,
      licenseNumber: dto.license_number,
      licenseCategory: dto.license_category,
    });

    await this.repository.save(driver);

    if (dto.vehicle_id) {
      await this.assignToVehicle(driver.id, dto.vehicle_id);
    }

    return this.findOne(driver.id);
  }

  /**
   * Atualiza parcialmente um motorista.
   *
   * @param id Identificador do motorista.
   * @param dto Campos a atualizar.
   * @returns DTO de resposta do motorista atualizado.
   * @throws NotFoundException Quando o motorista não existe.
   * @throws ConflictException Quando o novo número de CNH já está cadastrado.
   */
  async update(id: string, dto: UpdateDriverDto): Promise<DriverResponseDto> {
    const driver = await this.getOrFail(id);

    if (dto.license_number !== undefined && dto.license_number !== driver.licenseNumber) {
      await this.ensureLicenseIsUnique(dto.license_number, id);
      driver.licenseNumber = dto.license_number;
    }

    if (dto.name !== undefined) driver.name = dto.name;
    if (dto.license_category !== undefined) driver.licenseCategory = dto.license_category;

    await this.repository.save(driver);

    if (dto.vehicle_id !== undefined) {
      await this.assignToVehicle(id, dto.vehicle_id);
    }

    return this.findOne(id);
  }

  /**
   * Remove um motorista.
   *
   * @param id Identificador do motorista.
   * @throws NotFoundException Quando o motorista não existe.
   */
  async remove(id: string): Promise<void> {
    const driver = await this.getOrFail(id);
    await this.repository.remove(driver);
  }

  /**
   * Associa o motorista a um veículo, desalocando-o de qualquer outro.
   *
   * @param driverId Identificador do motorista.
   * @param vehicleId Identificador do veículo a associar.
   * @throws NotFoundException Quando o veículo não existe.
   */
  private async assignToVehicle(driverId: string, vehicleId: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    // Remove o motorista de qualquer outro veículo (relação 1—1).
    await this.vehicleRepository.update({ driverId, id: Not(vehicleId) }, { driverId: null });

    vehicle.driverId = driverId;
    await this.vehicleRepository.save(vehicle);
  }

  /**
   * Busca a entidade do motorista (com o veículo associado) ou lança exceção.
   *
   * @param id Identificador do motorista.
   * @returns A entidade do motorista.
   * @throws NotFoundException Quando o motorista não existe.
   */
  private async getOrFail(id: string): Promise<Driver> {
    const driver = await this.repository.findOne({
      where: { id },
      relations: { vehicle: true },
    });
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }
    return driver;
  }

  /**
   * Garante que o número da CNH não está em uso por outro motorista.
   *
   * @param licenseNumber Número da CNH a verificar.
   * @param ignoreId Identificador a ignorar na verificação (na atualização).
   * @throws ConflictException Quando o número já está cadastrado.
   */
  private async ensureLicenseIsUnique(licenseNumber: string, ignoreId?: string): Promise<void> {
    const existing = await this.repository.findOne({ where: { licenseNumber } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('CNH já cadastrada');
    }
  }
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { toRouteResponse } from '../common/mappers.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { CreateRouteDto } from './dto/create-route.dto.js';
import { RouteResponseDto } from './dto/route-response.dto.js';
import { UpdateRouteDto } from './dto/update-route.dto.js';
import { Route } from './route.entity.js';

/**
 * Serviço de rotas.
 *
 * Concentra o CRUD e a atribuição 1—1 entre rota e veículo. O lado dono é
 * `routes.assigned_vehicle_id`: atribuir uma rota a um veículo a remove de
 * qualquer outro veículo.
 */
@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route) private readonly repository: Repository<Route>,
    @InjectRepository(Vehicle) private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  /**
   * Lista todas as rotas.
   *
   * @returns Rotas convertidas para o DTO de resposta.
   */
  async findAll(): Promise<RouteResponseDto[]> {
    const routes = await this.repository.find({ order: { createdAt: 'ASC' } });
    return routes.map(toRouteResponse);
  }

  /**
   * Busca uma rota pelo identificador.
   *
   * @param id Identificador da rota.
   * @returns DTO de resposta da rota.
   * @throws NotFoundException Quando a rota não existe.
   */
  async findOne(id: string): Promise<RouteResponseDto> {
    return toRouteResponse(await this.getOrFail(id));
  }

  /**
   * Cria uma nova rota.
   *
   * @param dto Dados de criação.
   * @returns DTO de resposta da rota criada.
   * @throws ConflictException Quando o veículo já possui outra rota atribuída.
   * @throws NotFoundException Quando o veículo informado não existe.
   */
  async create(dto: CreateRouteDto): Promise<RouteResponseDto> {
    const assignedVehicleId = dto.assigned_vehicle_id ?? null;
    await this.ensureVehicleIsAssignable(assignedVehicleId);

    const route = this.repository.create({
      name: dto.name,
      geometry: dto.geometry,
      waypoints: dto.waypoints ?? [],
      assignedVehicleId,
    });

    await this.repository.save(route);
    return this.findOne(route.id);
  }

  /**
   * Atualiza parcialmente uma rota.
   *
   * @param id Identificador da rota.
   * @param dto Campos a atualizar.
   * @returns DTO de resposta da rota atualizada.
   * @throws NotFoundException Quando a rota (ou o veículo) não existe.
   * @throws ConflictException Quando o veículo já possui outra rota atribuída.
   */
  async update(id: string, dto: UpdateRouteDto): Promise<RouteResponseDto> {
    const route = await this.getOrFail(id);

    if (dto.name !== undefined) route.name = dto.name;
    if (dto.geometry !== undefined) route.geometry = dto.geometry;
    if (dto.waypoints !== undefined) route.waypoints = dto.waypoints;
    if (dto.status !== undefined) route.status = dto.status;

    if (dto.assigned_vehicle_id !== undefined) {
      await this.ensureVehicleIsAssignable(dto.assigned_vehicle_id, id);
      route.assignedVehicleId = dto.assigned_vehicle_id;
    }

    await this.repository.save(route);
    return this.findOne(id);
  }

  /**
   * Remove uma rota.
   *
   * @param id Identificador da rota.
   * @throws NotFoundException Quando a rota não existe.
   */
  async remove(id: string): Promise<void> {
    const route = await this.getOrFail(id);
    await this.repository.remove(route);
  }

  /**
   * Busca a entidade da rota ou lança `NotFoundException`.
   *
   * @param id Identificador da rota.
   * @returns A entidade da rota.
   * @throws NotFoundException Quando a rota não existe.
   */
  private async getOrFail(id: string): Promise<Route> {
    const route = await this.repository.findOne({ where: { id } });
    if (!route) {
      throw new NotFoundException('Rota não encontrada');
    }
    return route;
  }

  /**
   * Garante que o veículo existe e não possui outra rota atribuída.
   *
   * @param vehicleId Identificador do veículo, ou `null` (nada a validar).
   * @param keepRouteId Rota que deve manter a atribuição, se houver.
   * @throws NotFoundException Quando o veículo não existe.
   * @throws ConflictException Quando o veículo já possui outra rota.
   */
  private async ensureVehicleIsAssignable(
    vehicleId: string | null,
    keepRouteId?: string,
  ): Promise<void> {
    if (vehicleId === null) {
      return;
    }

    const vehicle = await this.vehicleRepository.findOne({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const where = keepRouteId
      ? { assignedVehicleId: vehicleId, id: Not(keepRouteId) }
      : { assignedVehicleId: vehicleId };
    const existing = await this.repository.findOne({ where });
    if (existing) {
      throw new ConflictException('Veículo já possui uma rota atribuída');
    }
  }
}

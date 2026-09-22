import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { NearbyRouteDto, RouteMetricsDto } from '@routeflow/contracts';
import { toRouteResponse } from '../common/mappers.js';
import { RoutingService } from '../routing/routing.service.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { CreateRouteDto } from './dto/create-route.dto.js';
import { RouteResponseDto } from './dto/route-response.dto.js';
import { UpdateRouteDto } from './dto/update-route.dto.js';
import { Route } from './route.entity.js';

/**
 * Serviço de rotas.
 *
 * Concentra o CRUD, o cálculo viário via RoutingService e a atribuição 1—1
 * entre rota e veículo. O lado dono é `routes.assigned_vehicle_id`: atribuir
 * uma rota a um veículo a remove de qualquer outro veículo.
 */
@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route) private readonly repository: Repository<Route>,
    @InjectRepository(Vehicle) private readonly vehicleRepository: Repository<Vehicle>,
    private readonly routingService: RoutingService,
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
   * Se forem informados no mínimo 2 waypoints, o traçado é gerado automaticamente
   * pelo motor de rotas (Valhalla) encaixado na malha viária conforme o tipo de veículo.
   *
   * @param dto Dados de criação.
   * @returns DTO de resposta da rota criada.
   * @throws BadRequestException Se nem waypoints nem geometry válidos forem informados.
   * @throws ConflictException Quando o veículo já possui outra rota atribuída.
   * @throws NotFoundException Quando o veículo informado não existe.
   */
  async create(dto: CreateRouteDto): Promise<RouteResponseDto> {
    const assignedVehicleId = dto.assigned_vehicle_id ?? null;
    const vehicle = await this.ensureVehicleIsAssignable(assignedVehicleId);

    let route: Route;

    if (dto.waypoints && dto.waypoints.length >= 2) {
      const routed = await this.routingService.route({
        waypoints: dto.waypoints,
        vehicleType: vehicle?.type,
      });

      route = this.repository.create({
        name: dto.name,
        geometry: routed.geometry,
        waypoints: dto.waypoints,
        assignedVehicleId,
        distanceM: routed.distanceM,
        durationS: routed.durationS,
        profile: this.routingService.resolveProfile(vehicle?.type),
        geometrySource: 'valhalla',
      });
    } else if (dto.geometry) {
      route = this.repository.create({
        name: dto.name,
        geometry: dto.geometry,
        waypoints: dto.waypoints ?? [],
        assignedVehicleId,
        distanceM: null,
        durationS: null,
        profile: null,
        geometrySource: 'manual',
      });
    } else {
      throw new BadRequestException(
        'É necessário informar waypoints com ao menos 2 pontos ou uma geometria válida',
      );
    }

    await this.repository.save(route);
    return this.findOne(route.id);
  }

  /**
   * Atualiza parcialmente uma rota.
   *
   * Se os waypoints mudarem (mínimo 2 pontos), o traçado e métricas são recalculados.
   * Se o veículo atribuído mudar de categoria (ex.: van para caminhão), o perfil é recomputado.
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
    if (dto.status !== undefined) route.status = dto.status;

    let vehicle: Vehicle | null = null;
    let vehicleChanged = false;

    if (dto.assigned_vehicle_id !== undefined) {
      vehicle = await this.ensureVehicleIsAssignable(dto.assigned_vehicle_id, id);
      route.assignedVehicleId = dto.assigned_vehicle_id;
      vehicleChanged = true;
    } else if (route.assignedVehicleId) {
      vehicle = await this.vehicleRepository.findOne({ where: { id: route.assignedVehicleId } });
    }

    if (dto.waypoints !== undefined) {
      if (dto.waypoints.length >= 2) {
        const routed = await this.routingService.route({
          waypoints: dto.waypoints,
          vehicleType: vehicle?.type,
        });

        route.geometry = routed.geometry;
        route.waypoints = dto.waypoints;
        route.distanceM = routed.distanceM;
        route.durationS = routed.durationS;
        route.profile = this.routingService.resolveProfile(vehicle?.type);
        route.geometrySource = 'valhalla';
      } else {
        route.waypoints = dto.waypoints;
      }
    } else if (vehicleChanged && route.waypoints && route.waypoints.length >= 2) {
      const newProfile = this.routingService.resolveProfile(vehicle?.type);
      if (route.profile && route.profile !== newProfile) {
        const routed = await this.routingService.route({
          waypoints: route.waypoints,
          vehicleType: vehicle?.type,
        });
        route.geometry = routed.geometry;
        route.distanceM = routed.distanceM;
        route.durationS = routed.durationS;
        route.profile = newProfile;
        route.geometrySource = 'valhalla';
      }
    } else if (dto.geometry !== undefined) {
      route.geometry = dto.geometry;
      route.geometrySource = 'manual';
      route.distanceM = null;
      route.durationS = null;
      route.profile = null;
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
   * Lista rotas cujo traçado passa dentro de um raio de um ponto (PostGIS).
   *
   * Usa `ST_DWithin` com geografia (metros) sobre a geometria da rota,
   * ordenando pelo resultado da distância.
   *
   * @param lng Longitude do ponto de referência.
   * @param lat Latitude do ponto de referência.
   * @param radiusM Raio de busca em metros.
   * @returns Rotas dentro do raio, com a distância mínima em metros.
   */
  async findNearby(lng: number, lat: number, radiusM: number): Promise<NearbyRouteDto[]> {
    const rows = await this.repository
      .createQueryBuilder('route')
      .select('route.id', 'id')
      .addSelect('route.name', 'name')
      .addSelect('ST_AsGeoJSON(route.geometry)::json', 'geometry')
      .addSelect('route.waypoints', 'waypoints')
      .addSelect('route.assigned_vehicle_id', 'assigned_vehicle_id')
      .addSelect('route.status', 'status')
      .addSelect(
        `ST_Distance(route.geometry::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)`,
        'distance_m',
      )
      .where(
        `ST_DWithin(route.geometry::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusM)`,
        { lng, lat, radiusM },
      )
      .orderBy('distance_m', 'ASC')
      .getRawMany<{
        id: string;
        name: string;
        geometry: NearbyRouteDto['geometry'];
        waypoints: NearbyRouteDto['waypoints'];
        assigned_vehicle_id: string | null;
        status: NearbyRouteDto['status'];
        distance_m: string;
      }>();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      geometry: row.geometry,
      waypoints: row.waypoints,
      assigned_vehicle_id: row.assigned_vehicle_id,
      status: row.status,
      distance_m: Number(row.distance_m),
    }));
  }

  /**
   * Calcula o comprimento de uma rota em metros (PostGIS).
   *
   * Usa `ST_Length` sobre a geografia para obter metros a partir do SRID 4326.
   *
   * @param id Identificador da rota.
   * @returns Métricas da rota (comprimento em metros).
   * @throws NotFoundException Quando a rota não existe.
   */
  async getMetrics(id: string): Promise<RouteMetricsDto> {
    await this.getOrFail(id);

    const row = await this.repository
      .createQueryBuilder('route')
      .select('ST_Length(route.geometry::geography)', 'length_m')
      .where('route.id = :id', { id })
      .getRawOne<{ length_m: string }>();

    return { route_id: id, length_m: Number(row?.length_m ?? 0) };
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
   * @returns O veículo encontrado ou `null` quando `vehicleId` for nulo.
   * @throws NotFoundException Quando o veículo não existe.
   * @throws ConflictException Quando o veículo já possui outra rota.
   */
  private async ensureVehicleIsAssignable(
    vehicleId: string | null,
    keepRouteId?: string,
  ): Promise<Vehicle | null> {
    if (vehicleId === null) {
      return null;
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

    return vehicle;
  }
}

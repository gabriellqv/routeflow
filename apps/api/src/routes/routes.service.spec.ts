import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VehicleType } from '@routeflow/contracts';
import { RoutingService } from '../routing/routing.service.js';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { CreateRouteDto } from './dto/create-route.dto.js';
import { Route } from './route.entity.js';
import { RoutesService } from './routes.service.js';

describe('RoutesService', () => {
  let service: RoutesService;
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let queryBuilder: {
    select: ReturnType<typeof vi.fn>;
    addSelect: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    getRawMany: ReturnType<typeof vi.fn>;
    getRawOne: ReturnType<typeof vi.fn>;
  };
  let vehicleRepository: {
    findOne: ReturnType<typeof vi.fn>;
  };
  let routingService: {
    route: ReturnType<typeof vi.fn>;
    resolveProfile: ReturnType<typeof vi.fn>;
  };

  const geometry = {
    type: 'LineString' as const,
    coordinates: [
      [-46.63, -23.55],
      [-46.64, -23.6],
    ] as [number, number][],
  };

  const waypoints = [
    { name: 'Ponto A', lng: -46.63, lat: -23.55 },
    { name: 'Ponto B', lng: -46.64, lat: -23.6 },
  ];

  const route = {
    id: 'route-1',
    name: 'Centro — Zona Sul',
    geometry,
    waypoints: [],
    assignedVehicleId: null,
    assignedVehicle: null,
    status: 'created',
    distanceM: null,
    durationS: null,
    profile: null,
    geometrySource: 'manual' as const,
    createdAt: new Date(),
  } as Route;

  beforeEach(async () => {
    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getRawMany: vi.fn(),
      getRawOne: vi.fn(),
    };
    repository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data: Partial<Route>) => data as Route),
      save: vi.fn((entity: Route) => {
        entity.id = entity.id || 'route-1';
        return Promise.resolve(entity);
      }),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(() => queryBuilder),
    };
    vehicleRepository = { findOne: vi.fn() };
    routingService = {
      route: vi.fn().mockResolvedValue({
        geometry: {
          type: 'LineString',
          coordinates: [
            [-46.63, -23.55],
            [-46.635, -23.575],
            [-46.64, -23.6],
          ],
        },
        distanceM: 6200,
        durationS: 720,
        profile: 'auto',
      }),
      resolveProfile: vi.fn((type?: VehicleType) =>
        type === VehicleType.Truck ? 'truck' : 'auto',
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: getRepositoryToken(Route), useValue: repository },
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepository },
        { provide: RoutingService, useValue: routingService },
      ],
    }).compile();

    service = moduleRef.get(RoutesService);
  });

  describe('create', () => {
    it('deve criar uma rota manual quando informada apenas geometria sem waypoints', async () => {
      repository.findOne.mockResolvedValueOnce(route);

      const dto: CreateRouteDto = { name: 'Centro — Zona Sul', geometry };

      const result = await service.create(dto);

      expect(vehicleRepository.findOne).not.toHaveBeenCalled();
      expect(routingService.route).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'route-1',
        name: 'Centro — Zona Sul',
        geometry,
        waypoints: [],
        assigned_vehicle_id: null,
        status: 'created',
        distance_m: null,
        duration_s: null,
        profile: null,
        geometry_source: 'manual',
      });
    });

    it('deve traçar rota viária com Valhalla quando informados >= 2 waypoints', async () => {
      const routedRoute = {
        ...route,
        waypoints,
        geometrySource: 'valhalla' as const,
        distanceM: 6200,
        durationS: 720,
        profile: 'auto',
      };
      repository.findOne.mockResolvedValueOnce(routedRoute);

      const dto: CreateRouteDto = {
        name: 'Rota Automática',
        waypoints,
      };

      const result = await service.create(dto);

      expect(routingService.route).toHaveBeenCalledWith({
        waypoints,
        vehicleType: undefined,
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rota Automática',
          waypoints,
          distanceM: 6200,
          durationS: 720,
          profile: 'auto',
          geometrySource: 'valhalla',
        }),
      );
      expect(result.geometry_source).toBe('valhalla');
    });

    it('deve lançar BadRequestException se nem waypoints nem geometria forem fornecidos', async () => {
      await expect(service.create({ name: 'Rota Vazia' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException quando o veículo não existe', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Rota', geometry, assigned_vehicle_id: 'vehicle-x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar ConflictException quando o veículo já possui rota', async () => {
      vehicleRepository.findOne.mockResolvedValue({ id: 'vehicle-1' } as Vehicle);
      repository.findOne.mockResolvedValue({ id: 'outra-rota' } as Route);

      await expect(
        service.create({ name: 'Rota', geometry, assigned_vehicle_id: 'vehicle-1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException quando a rota não existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve desatribuir o veículo quando assigned_vehicle_id é null', async () => {
      repository.findOne.mockResolvedValueOnce({ ...route, assignedVehicleId: 'vehicle-1' });
      repository.findOne.mockResolvedValueOnce({ ...route, assignedVehicleId: null });

      const result = await service.update('route-1', { assigned_vehicle_id: null });

      expect(result.assigned_vehicle_id).toBeNull();
    });

    it('deve recalcular geometria e métricas quando novos waypoints forem informados', async () => {
      const existingRoute = { ...route, id: 'route-1' };
      repository.findOne.mockResolvedValueOnce(existingRoute);
      repository.findOne.mockResolvedValueOnce({
        ...existingRoute,
        waypoints,
        distanceM: 6200,
        durationS: 720,
        geometrySource: 'valhalla' as const,
      });

      const result = await service.update('route-1', { waypoints });

      expect(routingService.route).toHaveBeenCalledWith({
        waypoints,
        vehicleType: undefined,
      });
      expect(result.distance_m).toBe(6200);
      expect(result.geometry_source).toBe('valhalla');
    });
  });

  describe('findNearby', () => {
    it('deve retornar rotas próximas com a distância convertida em número', async () => {
      queryBuilder.getRawMany.mockResolvedValue([
        {
          id: 'route-1',
          name: 'Centro — Zona Sul',
          geometry,
          waypoints: [],
          assigned_vehicle_id: null,
          status: 'created',
          distance_m: '123.45',
        },
      ]);

      const result = await service.findNearby(-46.63, -23.55, 1000);

      expect(result).toEqual([
        {
          id: 'route-1',
          name: 'Centro — Zona Sul',
          geometry,
          waypoints: [],
          assigned_vehicle_id: null,
          status: 'created',
          distance_m: 123.45,
        },
      ]);
    });
  });

  describe('getMetrics', () => {
    it('deve retornar o comprimento da rota em metros', async () => {
      repository.findOne.mockResolvedValue(route);
      queryBuilder.getRawOne.mockResolvedValue({ length_m: '4321.5' });

      const result = await service.getMetrics('route-1');

      expect(result).toEqual({ route_id: 'route-1', length_m: 4321.5 });
    });

    it('deve lançar NotFoundException quando a rota não existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getMetrics('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

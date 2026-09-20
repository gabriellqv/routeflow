import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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

  const geometry = {
    type: 'LineString' as const,
    coordinates: [
      [-46.63, -23.55],
      [-46.64, -23.6],
    ] as [number, number][],
  };

  const route = {
    id: 'route-1',
    name: 'Centro — Zona Sul',
    geometry,
    waypoints: [],
    assignedVehicleId: null,
    assignedVehicle: null,
    status: 'created',
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
      save: vi.fn((entity: Route) => Promise.resolve(entity)),
      remove: vi.fn(),
      createQueryBuilder: vi.fn(() => queryBuilder),
    };
    vehicleRepository = { findOne: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: getRepositoryToken(Route), useValue: repository },
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepository },
      ],
    }).compile();

    service = moduleRef.get(RoutesService);
  });

  describe('create', () => {
    it('deve criar uma rota sem veículo atribuído', async () => {
      repository.findOne.mockResolvedValueOnce(route);

      const dto: CreateRouteDto = { name: 'Centro — Zona Sul', geometry };

      const result = await service.create(dto);

      expect(vehicleRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'route-1',
        name: 'Centro — Zona Sul',
        geometry,
        waypoints: [],
        assigned_vehicle_id: null,
        status: 'created',
      });
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

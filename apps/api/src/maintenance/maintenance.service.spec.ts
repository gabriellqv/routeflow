import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaintenanceStatus, MaintenanceType, VehicleStatus } from '@routeflow/contracts';
import { Vehicle } from '../vehicles/vehicle.entity.js';
import { Maintenance } from './maintenance.entity.js';
import { MaintenanceService } from './maintenance.service.js';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let vehicleRepository: {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  const maintenance = {
    id: 'maintenance-1',
    vehicleId: 'vehicle-1',
    type: 'preventive',
    description: 'Troca de óleo',
    startedAt: null,
    finishedAt: null,
    status: MaintenanceStatus.Scheduled,
  } as Maintenance;

  beforeEach(async () => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data: Partial<Maintenance>) => data as Maintenance),
      save: vi.fn((entity: Maintenance) => Promise.resolve(entity)),
      remove: vi.fn(),
    };
    vehicleRepository = {
      findOne: vi.fn(),
      save: vi.fn((entity: Vehicle) => Promise.resolve(entity)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: getRepositoryToken(Maintenance), useValue: repository },
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepository },
      ],
    }).compile();

    service = moduleRef.get(MaintenanceService);
  });

  describe('create', () => {
    it('deve criar uma manutenção agendada', async () => {
      vehicleRepository.findOne.mockResolvedValue({ id: 'vehicle-1', status: VehicleStatus.Idle });
      repository.findOne.mockResolvedValueOnce(maintenance);

      const result = await service.create({
        vehicle_id: 'vehicle-1',
        type: MaintenanceType.Preventive,
        description: 'Troca de óleo',
      });

      expect(result).toMatchObject({
        id: 'maintenance-1',
        vehicle_id: 'vehicle-1',
        status: MaintenanceStatus.Scheduled,
        started_at: null,
        finished_at: null,
      });
    });

    it('deve lançar NotFoundException quando o veículo não existe', async () => {
      vehicleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          vehicle_id: 'veiculo-x',
          type: MaintenanceType.Preventive,
          description: 'A',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException quando a manutenção não existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve colocar o veículo em manutenção ao iniciar', async () => {
      const vehicle = { id: 'vehicle-1', status: VehicleStatus.Idle } as Vehicle;
      repository.findOne.mockResolvedValueOnce({ ...maintenance });
      vehicleRepository.findOne.mockResolvedValue(vehicle);
      repository.findOne.mockResolvedValueOnce({
        ...maintenance,
        status: MaintenanceStatus.InProgress,
      });

      const result = await service.update('maintenance-1', {
        status: MaintenanceStatus.InProgress,
      });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MaintenanceStatus.InProgress,
          startedAt: expect.any(Date),
        }),
      );
      expect(vehicleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: VehicleStatus.Maintenance }),
      );
      expect(result.status).toBe(MaintenanceStatus.InProgress);
    });

    it('deve liberar o veículo ao concluir', async () => {
      const vehicle = { id: 'vehicle-1', status: VehicleStatus.Maintenance } as Vehicle;
      repository.findOne.mockResolvedValueOnce({
        ...maintenance,
        status: MaintenanceStatus.InProgress,
      });
      vehicleRepository.findOne.mockResolvedValue(vehicle);
      repository.findOne.mockResolvedValueOnce({ ...maintenance, status: MaintenanceStatus.Done });

      await service.update('maintenance-1', { status: MaintenanceStatus.Done });

      expect(vehicleRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: VehicleStatus.Idle }),
      );
    });

    it('deve impedir alterar uma manutenção concluída', async () => {
      repository.findOne.mockResolvedValue({ ...maintenance, status: MaintenanceStatus.Done });

      await expect(
        service.update('maintenance-1', { status: MaintenanceStatus.InProgress }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

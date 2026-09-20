import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { Vehicle } from './vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const vehicle = {
    id: 'vehicle-1',
    plate: 'ABC1234',
    type: 'truck',
    model: 'Volvo FH',
    capacityKg: '12000',
    status: 'idle',
    driverId: null,
  } as Vehicle;

  beforeEach(async () => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data: Partial<Vehicle>) => data as Vehicle),
      save: vi.fn((entity: Vehicle) => Promise.resolve(entity)),
      remove: vi.fn(),
      update: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [VehiclesService, { provide: getRepositoryToken(Vehicle), useValue: repository }],
    }).compile();

    service = moduleRef.get(VehiclesService);
  });

  describe('create', () => {
    it('deve criar um veículo quando a placa é única', async () => {
      repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(vehicle);
      repository.save.mockResolvedValue({ ...vehicle });

      const dto = {
        plate: 'ABC1234',
        type: 'truck',
        model: 'Volvo FH',
        capacity_kg: 12000,
      } as CreateVehicleDto;

      const result = await service.create(dto);

      expect(result).toEqual({
        id: 'vehicle-1',
        plate: 'ABC1234',
        type: 'truck',
        model: 'Volvo FH',
        capacity_kg: 12000,
        status: 'idle',
        driver_id: null,
      });
    });

    it('deve lançar ConflictException quando a placa já existe', async () => {
      repository.findOne.mockResolvedValue({ id: 'outro' } as Vehicle);

      await expect(
        service.create({
          plate: 'ABC1234',
          type: 'truck',
          model: 'Volvo FH',
          capacity_kg: 12000,
        } as CreateVehicleDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException quando o veículo não existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve liberar o motorista de outros veículos ao alocar', async () => {
      repository.findOne.mockResolvedValue({ ...vehicle });

      await service.update('vehicle-1', { driver_id: 'driver-1' });

      expect(repository.update).toHaveBeenCalledWith(
        { driverId: 'driver-1', id: expect.anything() },
        { driverId: null },
      );
    });
  });
});

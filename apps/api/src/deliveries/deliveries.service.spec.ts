import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryStatus } from '@routeflow/contracts';
import { Route } from '../routes/route.entity.js';
import { DeliveriesService } from './deliveries.service.js';
import { Delivery } from './delivery.entity.js';
import { CreateDeliveryDto } from './dto/create-delivery.dto.js';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let routeRepository: {
    findOne: ReturnType<typeof vi.fn>;
  };

  const geolocation = {
    type: 'Point' as const,
    coordinates: [-46.6333, -23.5505] as [number, number],
  };

  const delivery = {
    id: 'delivery-1',
    routeId: 'route-1',
    order: 1,
    geolocation,
    address: 'Av. Paulista, 1000',
    status: 'pending',
    deliveredAt: null,
    createdAt: new Date(),
  } as Delivery;

  beforeEach(async () => {
    repository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data: Partial<Delivery>) => data as Delivery),
      save: vi.fn((entity: Delivery) => Promise.resolve(entity)),
      remove: vi.fn(),
    };
    routeRepository = { findOne: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: getRepositoryToken(Delivery), useValue: repository },
        { provide: getRepositoryToken(Route), useValue: routeRepository },
      ],
    }).compile();

    service = moduleRef.get(DeliveriesService);
  });

  describe('create', () => {
    it('deve criar uma entrega quando a rota existe e a ordem é única', async () => {
      routeRepository.findOne.mockResolvedValue({ id: 'route-1' } as Route);
      repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(delivery);

      const dto: CreateDeliveryDto = {
        route_id: 'route-1',
        order: 1,
        geolocation,
        address: 'Av. Paulista, 1000',
      };

      const result = await service.create(dto);

      expect(result).toMatchObject({
        id: 'delivery-1',
        route_id: 'route-1',
        order: 1,
        address: 'Av. Paulista, 1000',
        status: 'pending',
        delivered_at: null,
      });
    });

    it('deve lançar NotFoundException quando a rota não existe', async () => {
      routeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ route_id: 'rota-x', order: 1, geolocation, address: 'A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve lançar ConflictException quando a ordem já existe na rota', async () => {
      routeRepository.findOne.mockResolvedValue({ id: 'route-1' } as Route);
      repository.findOne.mockResolvedValue({ id: 'outra' } as Delivery);

      await expect(
        service.create({ route_id: 'route-1', order: 1, geolocation, address: 'A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findOne', () => {
    it('deve lançar NotFoundException quando a entrega não existe', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve definir delivered_at ao concluir a entrega', async () => {
      repository.findOne.mockResolvedValueOnce({ ...delivery, deliveredAt: null });
      repository.findOne.mockResolvedValueOnce({ ...delivery, status: 'done' });

      const result = await service.update('delivery-1', { status: DeliveryStatus.Done });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'done', deliveredAt: expect.any(Date) }),
      );
      expect(result.status).toBe('done');
    });
  });
});

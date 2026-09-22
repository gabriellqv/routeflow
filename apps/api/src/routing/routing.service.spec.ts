import {
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { VehicleType } from '@routeflow/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoutingService } from './routing.service.js';
import type { RoutedPath, RoutingProvider, RoutingProviderConfig } from './routing.types.js';

describe('RoutingService', () => {
  let service: RoutingService;
  let provider: {
    route: ReturnType<typeof vi.fn>;
    nearest: ReturnType<typeof vi.fn>;
  };
  const config: RoutingProviderConfig = {
    baseUrl: 'http://localhost:8002',
    timeoutMs: 5000,
    snapToleranceM: 150,
  };

  const samplePath: RoutedPath = {
    geometry: {
      type: 'LineString',
      coordinates: [
        [-46.6333, -23.5505],
        [-46.635, -23.555],
        [-46.638, -23.56],
      ],
    },
    distanceM: 1500,
    durationS: 180,
    snapped: [{ distanceM: 20 }, { distanceM: 15 }],
  };

  beforeEach(() => {
    provider = {
      route: vi.fn().mockResolvedValue(samplePath),
      nearest: vi.fn(),
    };

    service = new RoutingService(provider as unknown as RoutingProvider, config);
  });

  describe('resolveProfile', () => {
    it('deve mapear VehicleType.Truck para "truck"', () => {
      expect(service.resolveProfile(VehicleType.Truck)).toBe('truck');
    });

    it('deve mapear VehicleType.Van e Car para "auto"', () => {
      expect(service.resolveProfile(VehicleType.Van)).toBe('auto');
      expect(service.resolveProfile(VehicleType.Car)).toBe('auto');
    });

    it('deve mapear VehicleType.Motorcycle para "motorcycle"', () => {
      expect(service.resolveProfile(VehicleType.Motorcycle)).toBe('motorcycle');
    });

    it('deve adotar "auto" como padrão para tipos ausentes ou desconhecidos', () => {
      expect(service.resolveProfile(null)).toBe('auto');
      expect(service.resolveProfile(undefined)).toBe('auto');
    });
  });

  describe('route', () => {
    it('deve rejeitar requisições com menos de 2 waypoints', async () => {
      await expect(service.route({ waypoints: [{ lng: -46.63, lat: -23.55 }] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve delegar a rota ao provedor com o perfil correto', async () => {
      const waypoints = [
        { lng: -46.6333, lat: -23.5505 },
        { lng: -46.638, lat: -23.56 },
      ];

      const result = await service.route({
        waypoints,
        vehicleType: VehicleType.Truck,
      });

      expect(provider.route).toHaveBeenCalledWith({
        waypoints,
        profile: 'truck',
        costingOptions: undefined,
      });
      expect(result).toEqual(samplePath);
    });

    it('deve lançar UnprocessableEntityException se algum waypoint exceder a tolerância de snapping', async () => {
      provider.route.mockResolvedValue({
        ...samplePath,
        snapped: [{ distanceM: 20 }, { distanceM: 220 }], // 220m > 150m
      });

      const waypoints = [
        { lng: -46.6333, lat: -23.5505 },
        { lng: -46.638, lat: -23.56 },
      ];

      await expect(
        service.route({
          waypoints,
          vehicleType: VehicleType.Car,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('deve propagar ServiceUnavailableException quando o provedor falhar', async () => {
      provider.route.mockRejectedValue(
        new ServiceUnavailableException('Motor de rotas indisponível'),
      );

      const waypoints = [
        { lng: -46.6333, lat: -23.5505 },
        { lng: -46.638, lat: -23.56 },
      ];

      await expect(
        service.route({
          waypoints,
          vehicleType: VehicleType.Car,
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});

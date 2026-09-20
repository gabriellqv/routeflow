import { Test } from '@nestjs/testing';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants.js';
import { RedisHealthIndicator } from './redis.health.js';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let ping: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    ping = vi.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        HealthIndicatorService,
        { provide: REDIS_CLIENT, useValue: { ping } as unknown as Redis },
      ],
    }).compile();

    indicator = moduleRef.get(RedisHealthIndicator);
  });

  it('deve reportar "up" quando o Redis responde PONG', async () => {
    ping.mockResolvedValue('PONG');

    const result = await indicator.isHealthy('redis');

    expect(result).toMatchObject({ redis: { status: 'up' } } as HealthIndicatorResult);
    expect(ping).toHaveBeenCalledOnce();
  });

  it('deve reportar "down" quando o Redis responde algo diferente de PONG', async () => {
    ping.mockResolvedValue('ERRO');

    const result = await indicator.isHealthy('redis');

    expect(result).toMatchObject({ redis: { status: 'down' } } as HealthIndicatorResult);
  });

  it('deve reportar "down" quando ocorre erro de conexão', async () => {
    ping.mockRejectedValue(new Error('conexão recusada'));

    const result = await indicator.isHealthy('redis');

    expect(result).toMatchObject({
      redis: { status: 'down', message: 'conexão recusada' },
    } as HealthIndicatorResult);
  });
});

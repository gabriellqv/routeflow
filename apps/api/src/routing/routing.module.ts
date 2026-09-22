import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ROUTING_OPTIONS, ROUTING_PROVIDER } from './routing.constants.js';
import { RoutingService } from './routing.service.js';
import type { RoutingProviderConfig } from './routing.types.js';
import { ValhallaProvider } from './valhalla.provider.js';

/**
 * Módulo responsável pela resolução e cálculo de rotas viárias na malha do OpenStreetMap.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ROUTING_OPTIONS,
      useFactory: (config: ConfigService): RoutingProviderConfig => ({
        baseUrl: config.get<string>('routingBaseUrl', 'http://localhost:8002'),
        timeoutMs: config.get<number>('routingTimeoutMs', 5000),
        snapToleranceM: config.get<number>('routingSnapToleranceM', 150),
      }),
      inject: [ConfigService],
    },
    {
      provide: ROUTING_PROVIDER,
      useClass: ValhallaProvider,
    },
    RoutingService,
  ],
  exports: [RoutingService, ROUTING_PROVIDER, ROUTING_OPTIONS],
})
export class RoutingModule {}

import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { BullQueues, RedisKeys, type VehicleState } from '@routeflow/contracts';
import type { Job, Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants.js';
import { VehiclePositionsService } from '../positions/vehicle-positions.service.js';

/** Identificador do job scheduler de snapshots e nome do job. */
export const POSITION_SNAPSHOT_JOB = 'position-snapshot';

/** Intervalo entre snapshots (em milissegundos). */
export const POSITION_SNAPSHOT_INTERVAL_MS = 15000;

/** Snapshot lido do Redis, pronto para persistência. */
export interface PositionSnapshot {
  vehicleId: string;
  lng: number;
  lat: number;
  speedKmh: number;
  status: string;
}

/**
 * Worker de snapshots de posição.
 *
 * Job recorrente (a cada ~15 s) que lê o estado atual de todos os veículos do
 * Redis (`vehicle:{id}:state` + `vehicles:geo`) e persiste em lote na tabela
 * `vehicle_positions` (PostGIS), formando o histórico consultável por região.
 */
@Processor(BullQueues.positionSnapshots)
export class PositionSnapshotsWorker extends WorkerHost {
  private readonly logger = new Logger(PositionSnapshotsWorker.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly positions: VehiclePositionsService,
  ) {
    super();
  }

  /**
   * Processa um ciclo de snapshot.
   *
   * @param job Job recorrente.
   */
  async process(job: Job): Promise<void> {
    if (job.name !== POSITION_SNAPSHOT_JOB) {
      return;
    }

    try {
      const snapshots = await readVehicleStates(this.redis);

      if (snapshots.length === 0) {
        return;
      }

      await this.positions.saveMany(snapshots);
      this.logger.debug(`Snapshot de ${snapshots.length} veículo(s) gravado`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.error(`Falha ao gravar snapshots: ${message}`);
      throw error;
    }
  }
}

/**
 * Serviço que agenda o job recorrente de snapshots na inicialização.
 */
export class PositionSnapshotsScheduler implements OnModuleInit {
  private readonly logger = new Logger(PositionSnapshotsScheduler.name);

  constructor(@InjectQueue(BullQueues.positionSnapshots) private readonly queue: Queue) {}

  /**
   * Registra (idempotente) o job scheduler de snapshots.
   */
  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      POSITION_SNAPSHOT_JOB,
      { every: POSITION_SNAPSHOT_INTERVAL_MS },
      { name: POSITION_SNAPSHOT_JOB },
    );

    this.logger.log(`Snapshots agendados a cada ${POSITION_SNAPSHOT_INTERVAL_MS} ms`);
  }
}

/**
 * Lê o estado atual de cada membro do índice geoespacial do Redis.
 *
 * @param redis Cliente Redis.
 * @returns Lista de snapshots prontos para persistência.
 */
export async function readVehicleStates(redis: Redis): Promise<PositionSnapshot[]> {
  const members = await redis.zrange(RedisKeys.vehiclesGeo, 0, '-1');

  if (members.length === 0) {
    return [];
  }

  const snapshots: PositionSnapshot[] = [];

  for (const vehicleId of members) {
    const raw = await redis.hget(RedisKeys.vehicleState(vehicleId), 'data');

    if (!raw) {
      continue;
    }

    try {
      const state = JSON.parse(raw) as VehicleState;
      snapshots.push({
        vehicleId,
        lng: state.lng,
        lat: state.lat,
        speedKmh: state.speed_kmh,
        status: state.status,
      });
    } catch {
      // Estado inválido é ignorado; será relido no próximo ciclo.
    }
  }

  return snapshots;
}

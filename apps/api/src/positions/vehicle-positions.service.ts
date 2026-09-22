import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PositionSnapshot } from '../workers/position-snapshots.worker.js';
import { VehiclePosition } from './vehicle-position.entity.js';

/**
 * Serviço de persistência do histórico de posições.
 *
 * Grava snapshots em lote na tabela `vehicle_positions` (PostGIS). A gravação é
 * feita via SQL parametrizado com `ST_MakePoint`, permitindo inserir vários
 * veículos em uma única query.
 */
@Injectable()
export class VehiclePositionsService {
  constructor(
    @InjectRepository(VehiclePosition)
    private readonly repository: Repository<VehiclePosition>,
  ) {}

  /**
   * Persiste um lote de snapshots de posição.
   *
   * @param snapshots Snapshots lidos do Redis.
   */
  async saveMany(snapshots: PositionSnapshot[]): Promise<void> {
    if (snapshots.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const placeholders = snapshots.map((snapshot, index) => {
      const base = index * 5;
      values.push(
        snapshot.vehicleId,
        snapshot.lng,
        snapshot.lat,
        snapshot.speedKmh,
        snapshot.status,
      );
      return `($${base + 1}, ST_SetSRID(ST_MakePoint($${base + 2}, $${base + 3}), 4326), $${base + 4}, $${base + 5}, now())`;
    });

    await this.repository.query(
      `INSERT INTO "vehicle_positions" ("vehicle_id", "position", "speed_kmh", "status", "recorded_at")
       VALUES ${placeholders.join(', ')}`,
      values,
    );
  }
}

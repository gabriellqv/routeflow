import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { VehicleEventMessage } from '@routeflow/contracts';
import { EventLog } from './event-log.entity.js';

/**
 * Serviço de persistência do log de eventos.
 *
 * Grava os eventos consumidos da stream `vehicles:events` na tabela `event_log`
 * para auditoria e consulta posterior.
 */
@Injectable()
export class EventLogService {
  constructor(@InjectRepository(EventLog) private readonly repository: Repository<EventLog>) {}

  /**
   * Persiste um evento de veículo.
   *
   * @param event Evento consumido da stream.
   */
  async save(event: VehicleEventMessage): Promise<void> {
    const occurredAt = new Date(event.ts);
    const record = this.repository.create({
      vehicleId: event.vehicle_id,
      type: event.type,
      payload: event.payload,
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
    });

    await this.repository.save(record);
  }
}

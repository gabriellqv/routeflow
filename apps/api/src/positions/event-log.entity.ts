import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity.js';

/**
 * Registro histórico de um evento de veículo.
 *
 * Cada linha corresponde a um evento consumido da stream `vehicles:events`,
 * preservando o tipo e o payload completos para auditoria e consulta posterior.
 */
@Entity('event_log')
export class EventLog {
  /** Identificador único do registro. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Veículo associado ao evento. */
  @Index()
  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId: string;

  /** Veículo associado. */
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  /** Tipo do evento (conforme `VehicleEventType`). */
  @Column({ type: 'text' })
  type: string;

  /** Payload do evento. */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  /** Momento do evento informado pelo simulador. */
  @Column({ type: 'timestamptz', name: 'occurred_at' })
  occurredAt: Date;

  /** Data de criação do registro. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

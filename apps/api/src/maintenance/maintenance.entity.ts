import { MaintenanceStatus, MaintenanceType } from '@routeflow/contracts';
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
 * Entidade que representa uma manutenção de veículo.
 *
 * Cada manutenção pertence a um veículo (`vehicle_id`, `ON DELETE CASCADE`) e
 * registra o ciclo de vida (`scheduled` → `in_progress` → `done`), com as datas
 * de início e conclusão preenchidas conforme o status evolui.
 */
@Entity('maintenances')
export class Maintenance {
  /** Identificador único da manutenção. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Veículo submetido à manutenção. */
  @Index()
  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId: string;

  /** Veículo associado. */
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  /** Tipo da manutenção (preventiva ou corretiva). */
  @Column({ type: 'text' })
  type: MaintenanceType;

  /** Descrição da manutenção. */
  @Column({ type: 'text' })
  description: string;

  /** Data de início (preenchida ao entrar em andamento). */
  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt: Date | null;

  /** Data de conclusão (preenchida ao finalizar). */
  @Column({ type: 'timestamptz', name: 'finished_at', nullable: true })
  finishedAt: Date | null;

  /** Status da manutenção. */
  @Column({ type: 'text', default: MaintenanceStatus.Scheduled })
  status: MaintenanceStatus;

  /** Data de criação do registro. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

import { VehicleStatus, VehicleType } from '@routeflow/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Driver } from '../drivers/driver.entity.js';

/**
 * Entidade que representa um veículo da frota.
 *
 * A relação com `Driver` é 1—1 opcional (lado dono, via `driver_id`): um
 * motorista pode estar alocado a um veículo, e `driverId` permanece `null`
 * enquanto não houver atribuição.
 */
@Entity('vehicles')
export class Vehicle {
  /** Identificador único do veículo. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Placa única do veículo. */
  @Column({ type: 'text', unique: true })
  plate: string;

  /** Tipo do veículo (caminhão, van, carro ou moto). */
  @Column({ type: 'text' })
  type: VehicleType;

  /** Modelo do veículo. */
  @Column({ type: 'text' })
  model: string;

  /** Capacidade de carga em quilogramas. */
  @Column({ type: 'numeric', name: 'capacity_kg' })
  capacityKg: string;

  /** Status operacional atual do veículo. */
  @Column({ type: 'text', default: VehicleStatus.Idle })
  status: VehicleStatus;

  /** Identificador do motorista alocado (opcional). */
  @Column({ type: 'uuid', name: 'driver_id', nullable: true })
  driverId: string | null;

  /** Motorista atualmente alocado (opcional). */
  @OneToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver | null;

  /** Data de criação do registro. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  /** Data da última atualização do registro. */
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity.js';

/**
 * Entidade que representa um motorista.
 *
 * A relação com `Vehicle` é o lado inverso da associação 1—1 declarada em
 * `Vehicle` (que detém a coluna `driver_id`).
 */
@Entity('drivers')
export class Driver {
  /** Identificador único do motorista. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nome do motorista. */
  @Column({ type: 'text' })
  name: string;

  /** Número da CNH, único por motorista. */
  @Column({ type: 'text', name: 'license_number', unique: true })
  licenseNumber: string;

  /** Categoria da CNH (ex.: `A`, `B`, `C`, `D`, `E`). */
  @Column({ type: 'text', name: 'license_category' })
  licenseCategory: string;

  /** Veículo atualmente associado (opcional). */
  @OneToOne(() => Vehicle, (vehicle) => vehicle.driver)
  vehicle: Vehicle | null;

  /** Data de criação do registro. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

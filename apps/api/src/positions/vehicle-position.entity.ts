import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity.js';

/**
 * Geometria GeoJSON de um ponto, no formato retornado pelo PostGIS.
 *
 * As coordenadas seguem a ordem `[longitude, latitude]` (SRID 4326).
 */
export interface PositionPointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

/**
 * Registro histórico da posição de um veículo.
 *
 * Cada linha é um snapshot gravado periodicamente a partir do estado quente do
 * Redis (`vehicle:{id}:state`), formando o histórico consultável por região via
 * PostGIS. O `id` é um `bigserial` para suportar alto volume de inserções.
 */
@Entity('vehicle_positions')
export class VehiclePosition {
  /** Identificador sequencial do snapshot. */
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** Veículo ao qual a posição pertence. */
  @Index()
  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId: string;

  /** Veículo associado. */
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  /** Posição do veículo como GeoJSON Point (SRID 4326). */
  @Index({ spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  position: PositionPointGeometry;

  /** Velocidade no momento do snapshot (km/h). */
  @Column({ type: 'numeric', name: 'speed_kmh' })
  speedKmh: string;

  /** Status do veículo no momento do snapshot. */
  @Column({ type: 'text' })
  status: string;

  /** Momento em que a posição foi registrada. */
  @Index()
  @Column({ type: 'timestamptz', name: 'recorded_at' })
  recordedAt: Date;
}

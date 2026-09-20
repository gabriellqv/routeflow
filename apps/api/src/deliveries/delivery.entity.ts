import { DeliveryStatus } from '@routeflow/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Route } from '../routes/route.entity.js';

/**
 * Geometria GeoJSON de um ponto, no formato retornado pelo PostGIS.
 *
 * As coordenadas seguem a ordem `[longitude, latitude]` (SRID 4326).
 */
export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

/**
 * Entidade que representa uma entrega (parada) de uma rota.
 *
 * A localização é armazenada como `geometry(Point, 4326)` (PostGIS) e indexada
 * com GiST. Cada rota pode ter no máximo uma entrega na mesma ordem
 * (`route_id`, `order`).
 */
@Entity('deliveries')
@Unique('UQ_deliveries_route_order', ['routeId', 'order'])
export class Delivery {
  /** Identificador único da entrega. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Rota à qual a entrega pertence. */
  @Column({ type: 'uuid', name: 'route_id' })
  routeId: string;

  /** Rota associada. */
  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  /** Ordem da entrega na rota. */
  @Column({ type: 'int', name: 'order' })
  order: number;

  /** Local da entrega como GeoJSON Point (SRID 4326). */
  @Index({ spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  geolocation: PointGeometry;

  /** Endereço textual da entrega. */
  @Column({ type: 'text' })
  address: string;

  /** Status da entrega. */
  @Column({ type: 'text', default: DeliveryStatus.Pending })
  status: DeliveryStatus;

  /** Momento em que a entrega foi concluída (opcional). */
  @Column({ type: 'timestamptz', name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;

  /** Data de criação do registro. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

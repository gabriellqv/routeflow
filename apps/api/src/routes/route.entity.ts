import { RouteStatus } from '@routeflow/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity.js';

/**
 * Geometria GeoJSON de uma rota, no formato retornado pelo PostGIS.
 *
 * As coordenadas seguem a ordem `[longitude, latitude]` (SRID 4326).
 */
export interface LineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

/**
 * Ponto intermediário da rota, persistido como `jsonb`.
 */
export interface RouteWaypoint {
  lng: number;
  lat: number;
}

/**
 * Entidade que representa uma rota de entrega.
 *
 * O traçado é armazenado como `geometry(LineString, 4326)` (PostGIS) e
 * indexado com GiST. A atribuição a um veículo é 1—1 opcional, com o lado dono
 * em `routes.assigned_vehicle_id`.
 */
@Entity('routes')
export class Route {
  /** Identificador único da rota. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nome/descrição da rota. */
  @Column({ type: 'text' })
  name: string;

  /** Traçado da rota como GeoJSON LineString (SRID 4326). */
  @Index({ spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'LineString', srid: 4326 })
  geometry: LineStringGeometry;

  /** Pontos intermediários da rota. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  waypoints: RouteWaypoint[];

  /** Identificador do veículo atribuído (opcional). */
  @Column({ type: 'uuid', name: 'assigned_vehicle_id', nullable: true })
  assignedVehicleId: string | null;

  /** Veículo atualmente atribuído (opcional). */
  @OneToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_vehicle_id' })
  assignedVehicle: Vehicle | null;

  /** Status operacional da rota. */
  @Column({ type: 'text', default: RouteStatus.Created })
  status: RouteStatus;

  /** Distância total da rota em metros calculada pelo motor. */
  @Column({ type: 'double precision', name: 'distance_m', nullable: true })
  distanceM: number | null;

  /** Duração estimada da rota em segundos calculada pelo motor. */
  @Column({ type: 'double precision', name: 'duration_s', nullable: true })
  durationS: number | null;

  /** Perfil de roteamento ('auto' | 'truck' | 'motorcycle'). */
  @Column({ type: 'text', nullable: true })
  profile: string | null;

  /** Origem da geometria ('manual' ou 'valhalla'). */
  @Column({ type: 'text', name: 'geometry_source', default: 'manual' })
  geometrySource: 'manual' | 'valhalla';

  /** Data de criação do registro. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

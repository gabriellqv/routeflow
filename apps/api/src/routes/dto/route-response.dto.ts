import type { GeoJsonLineString, RouteDto, WaypointDto } from '@routeflow/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { RouteStatus } from '@routeflow/contracts';

/**
 * Representação de uma rota retornada pela API.
 *
 * Segue o contrato compartilhado `RouteDto` (`@routeflow/contracts`) e usa os
 * nomes de campo em `snake_case` definidos para as respostas JSON.
 */
export class RouteResponseDto implements RouteDto {
  /** Identificador único da rota. */
  @ApiProperty({ format: 'uuid' })
  id: string;

  /** Nome/descrição da rota. */
  @ApiProperty({ example: 'Centro — Zona Sul' })
  name: string;

  /** Traçado da rota como GeoJSON LineString. */
  @ApiProperty({
    example: {
      type: 'LineString',
      coordinates: [
        [-46.63, -23.55],
        [-46.64, -23.6],
      ],
    },
  })
  geometry: GeoJsonLineString;

  /** Pontos intermediários da rota. */
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  waypoints: WaypointDto[];

  /** Identificador do veículo atribuído, ou `null`. */
  @ApiProperty({ format: 'uuid', nullable: true })
  assigned_vehicle_id: string | null;

  /** Status operacional da rota. */
  @ApiProperty({ enum: RouteStatus })
  status: RouteDto['status'];
}

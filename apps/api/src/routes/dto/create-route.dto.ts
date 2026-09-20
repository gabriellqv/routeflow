import type { GeoJsonLineString } from '@routeflow/contracts';
import { WaypointDto } from '@routeflow/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsLineString } from '../../common/validators/is-line-string.decorator.js';

/**
 * Ponto intermediário da rota (entrada).
 */
export class WaypointInputDto implements WaypointDto {
  /** Longitude do ponto. */
  @ApiProperty({ example: -46.6333, minimum: -180, maximum: 180 })
  @IsNumber()
  lng: number;

  /** Latitude do ponto. */
  @ApiProperty({ example: -23.5505, minimum: -90, maximum: 90 })
  @IsNumber()
  lat: number;
}

/**
 * Dados de entrada para criação de uma rota.
 */
export class CreateRouteDto {
  /** Nome/descrição da rota. */
  @ApiProperty({ example: 'Centro — Zona Sul' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
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
  @IsLineString()
  geometry: GeoJsonLineString;

  /** Pontos intermediários da rota. */
  @ApiPropertyOptional({ type: [WaypointInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointInputDto)
  waypoints?: WaypointInputDto[];

  /** Veículo a atribuir (opcional). */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigned_vehicle_id?: string;
}

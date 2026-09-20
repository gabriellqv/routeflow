import type { GeoJsonLineString } from '@routeflow/contracts';
import { RouteStatus } from '@routeflow/contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsLineString } from '../../common/validators/is-line-string.decorator.js';
import { WaypointInputDto } from './create-route.dto.js';

/**
 * Dados de entrada para atualização parcial de uma rota.
 *
 * Todos os campos são opcionais. `assigned_vehicle_id` aceita `null` para
 * remover a atribuição do veículo.
 */
export class UpdateRouteDto {
  /** Nome/descrição da rota. */
  @ApiPropertyOptional({ example: 'Centro — Zona Sul' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  /** Traçado da rota como GeoJSON LineString. */
  @ApiPropertyOptional({
    example: {
      type: 'LineString',
      coordinates: [
        [-46.63, -23.55],
        [-46.64, -23.6],
      ],
    },
  })
  @IsOptional()
  @IsLineString()
  geometry?: GeoJsonLineString;

  /** Pontos intermediários da rota. */
  @ApiPropertyOptional({ type: [WaypointInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointInputDto)
  waypoints?: WaypointInputDto[];

  /** Veículo a atribuir, ou `null` para desatribuir. */
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assigned_vehicle_id?: string | null;

  /** Status operacional da rota. */
  @ApiPropertyOptional({ enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;
}

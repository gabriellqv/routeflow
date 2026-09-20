import type { GeoJsonPoint } from '@routeflow/contracts';
import { DeliveryStatus } from '@routeflow/contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { IsPoint } from '../../common/validators/is-point.decorator.js';

/**
 * Dados de entrada para atualização parcial de uma entrega.
 *
 * Todos os campos são opcionais.
 */
export class UpdateDeliveryDto {
  /** Ordem da entrega na rota. */
  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /** Local da entrega como GeoJSON Point. */
  @ApiPropertyOptional({ example: { type: 'Point', coordinates: [-46.6333, -23.5505] } })
  @IsOptional()
  @IsPoint()
  geolocation?: GeoJsonPoint;

  /** Endereço textual da entrega. */
  @ApiPropertyOptional({ example: 'Av. Paulista, 1000' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  address?: string;

  /** Status da entrega. */
  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;
}

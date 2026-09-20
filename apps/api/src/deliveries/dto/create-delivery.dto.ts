import type { GeoJsonPoint } from '@routeflow/contracts';
import { DeliveryStatus } from '@routeflow/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsPoint } from '../../common/validators/is-point.decorator.js';

/**
 * Dados de entrada para criação de uma entrega.
 */
export class CreateDeliveryDto {
  /** Rota à qual a entrega pertence. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  route_id: string;

  /** Ordem da entrega na rota. */
  @ApiProperty({ example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  order: number;

  /** Local da entrega como GeoJSON Point. */
  @ApiProperty({ example: { type: 'Point', coordinates: [-46.6333, -23.5505] } })
  @IsPoint()
  geolocation: GeoJsonPoint;

  /** Endereço textual da entrega. */
  @ApiProperty({ example: 'Av. Paulista, 1000' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  address: string;

  /** Status inicial da entrega (opcional). */
  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;
}

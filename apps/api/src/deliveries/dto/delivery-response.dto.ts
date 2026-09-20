import type { DeliveryDto, GeoJsonPoint } from '@routeflow/contracts';
import { DeliveryStatus } from '@routeflow/contracts';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Representação de uma entrega retornada pela API.
 *
 * Segue o contrato compartilhado `DeliveryDto` (`@routeflow/contracts`) e usa
 * os nomes de campo em `snake_case` definidos para as respostas JSON.
 */
export class DeliveryResponseDto implements DeliveryDto {
  /** Identificador único da entrega. */
  @ApiProperty({ format: 'uuid' })
  id: string;

  /** Identificador da rota. */
  @ApiProperty({ format: 'uuid' })
  route_id: string;

  /** Ordem da entrega na rota. */
  @ApiProperty({ example: 1 })
  order: number;

  /** Local da entrega como GeoJSON Point. */
  @ApiProperty({ example: { type: 'Point', coordinates: [-46.6333, -23.5505] } })
  geolocation: GeoJsonPoint;

  /** Endereço textual da entrega. */
  @ApiProperty({ example: 'Av. Paulista, 1000' })
  address: string;

  /** Status da entrega. */
  @ApiProperty({ enum: DeliveryStatus })
  status: DeliveryStatus;

  /** Momento de conclusão da entrega, ou `null`. */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  delivered_at: string | null;
}

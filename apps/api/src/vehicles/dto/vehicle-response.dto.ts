import { VehicleDto } from '@routeflow/contracts';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Representação de um veículo retornada pela API.
 *
 * Segue o contrato compartilhado `VehicleDto` (`@routeflow/contracts`) e usa
 * os nomes de campo em `snake_case` definidos para as respostas JSON.
 */
export class VehicleResponseDto implements VehicleDto {
  /** Identificador único do veículo. */
  @ApiProperty({ format: 'uuid' })
  id: string;

  /** Placa do veículo. */
  @ApiProperty({ example: 'ABC1234' })
  plate: string;

  /** Tipo do veículo. */
  @ApiProperty({ enum: ['truck', 'van', 'car', 'motorcycle'] })
  type: VehicleDto['type'];

  /** Modelo do veículo. */
  @ApiProperty({ example: 'Volvo FH' })
  model: string;

  /** Capacidade de carga em quilogramas. */
  @ApiProperty({ example: 12000 })
  capacity_kg: number;

  /** Status operacional atual. */
  @ApiProperty({ enum: ['idle', 'in_route', 'stopped', 'fault', 'maintenance'] })
  status: VehicleDto['status'];

  /** Identificador do motorista alocado, ou `null`. */
  @ApiProperty({ format: 'uuid', nullable: true })
  driver_id: string | null;
}

import { DriverDto } from '@routeflow/contracts';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Representação de um motorista retornada pela API.
 *
 * Segue o contrato compartilhado `DriverDto` (`@routeflow/contracts`) e usa os
 * nomes de campo em `snake_case` definidos para as respostas JSON.
 */
export class DriverResponseDto implements DriverDto {
  /** Identificador único do motorista. */
  @ApiProperty({ format: 'uuid' })
  id: string;

  /** Nome do motorista. */
  @ApiProperty({ example: 'João da Silva' })
  name: string;

  /** Número da CNH. */
  @ApiProperty({ example: '12345678900' })
  license_number: string;

  /** Categoria da CNH. */
  @ApiProperty({ example: 'D' })
  license_category: string;

  /** Identificador do veículo associado, ou `null`. */
  @ApiProperty({ format: 'uuid', nullable: true })
  vehicle_id: string | null;
}

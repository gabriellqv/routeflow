import type { MaintenanceDto } from '@routeflow/contracts';
import { MaintenanceStatus, MaintenanceType } from '@routeflow/contracts';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Representação de uma manutenção retornada pela API.
 *
 * Segue o contrato compartilhado `MaintenanceDto` (`@routeflow/contracts`) e usa
 * os nomes de campo em `snake_case` definidos para as respostas JSON.
 */
export class MaintenanceResponseDto implements MaintenanceDto {
  /** Identificador único da manutenção. */
  @ApiProperty({ format: 'uuid' })
  id: string;

  /** Identificador do veículo. */
  @ApiProperty({ format: 'uuid' })
  vehicle_id: string;

  /** Tipo da manutenção. */
  @ApiProperty({ enum: MaintenanceType })
  type: MaintenanceType;

  /** Descrição da manutenção. */
  @ApiProperty({ example: 'Troca de óleo e revisão de freios' })
  description: string;

  /** Data de início, ou `null`. */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  started_at: string | null;

  /** Data de conclusão, ou `null`. */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  finished_at: string | null;

  /** Status da manutenção. */
  @ApiProperty({ enum: MaintenanceStatus })
  status: MaintenanceStatus;
}

import { MaintenanceStatus, MaintenanceType } from '@routeflow/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Dados de entrada para criação de uma manutenção.
 */
export class CreateMaintenanceDto {
  /** Veículo submetido à manutenção. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vehicle_id: string;

  /** Tipo da manutenção. */
  @ApiProperty({ enum: MaintenanceType, example: MaintenanceType.Preventive })
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  /** Descrição da manutenção. */
  @ApiProperty({ example: 'Troca de óleo e revisão de freios' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description: string;

  /** Status inicial da manutenção (opcional). */
  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;
}

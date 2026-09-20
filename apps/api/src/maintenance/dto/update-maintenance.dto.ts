import { MaintenanceStatus, MaintenanceType } from '@routeflow/contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Dados de entrada para atualização parcial de uma manutenção.
 *
 * Todos os campos são opcionais. As datas de início/conclusão são derivadas do
 * status e não são editáveis diretamente.
 */
export class UpdateMaintenanceDto {
  /** Tipo da manutenção. */
  @ApiPropertyOptional({ enum: MaintenanceType })
  @IsOptional()
  @IsEnum(MaintenanceType)
  type?: MaintenanceType;

  /** Descrição da manutenção. */
  @ApiPropertyOptional({ example: 'Troca de óleo e revisão de freios' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description?: string;

  /** Status da manutenção. */
  @ApiPropertyOptional({ enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;
}

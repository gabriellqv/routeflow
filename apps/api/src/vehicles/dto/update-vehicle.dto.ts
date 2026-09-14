import { VehicleStatus, VehicleType } from '@routeflow/contracts';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Dados de entrada para atualização parcial de um veículo.
 *
 * Todos os campos são opcionais. `driver_id` aceita `null` para remover a
 * alocação do motorista.
 */
export class UpdateVehicleDto {
  /** Placa do veículo. */
  @ApiPropertyOptional({ example: 'ABC1234' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(10)
  plate?: string;

  /** Tipo do veículo. */
  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  /** Modelo do veículo. */
  @ApiPropertyOptional({ example: 'Volvo FH' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model?: string;

  /** Capacidade de carga em quilogramas. */
  @ApiPropertyOptional({ example: 12000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  capacity_kg?: number;

  /** Status operacional do veículo. */
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  /** Motorista a alocar, ou `null` para desalocar. */
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  driver_id?: string | null;
}

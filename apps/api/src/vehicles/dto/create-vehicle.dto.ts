import { VehicleType } from '@routeflow/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Dados de entrada para criação de um veículo.
 */
export class CreateVehicleDto {
  /** Placa do veículo. */
  @ApiProperty({ example: 'ABC1234' })
  @IsString()
  @MinLength(5)
  @MaxLength(10)
  plate: string;

  /** Tipo do veículo. */
  @ApiProperty({ enum: VehicleType, example: VehicleType.Truck })
  @IsEnum(VehicleType)
  type: VehicleType;

  /** Modelo do veículo. */
  @ApiProperty({ example: 'Volvo FH' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model: string;

  /** Capacidade de carga em quilogramas. */
  @ApiProperty({ example: 12000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  capacity_kg: number;

  /** Motorista a alocar (opcional). */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  driver_id?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Dados de entrada para criação de um motorista.
 */
export class CreateDriverDto {
  /** Nome do motorista. */
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  /** Número da CNH. */
  @ApiProperty({ example: '12345678900' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  license_number: string;

  /** Categoria da CNH. */
  @ApiProperty({ example: 'D' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  license_category: string;

  /** Veículo a associar (opcional). */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicle_id?: string;
}

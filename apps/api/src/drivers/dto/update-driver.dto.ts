import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * Dados de entrada para atualização parcial de um motorista.
 *
 * Todos os campos são opcionais.
 */
export class UpdateDriverDto {
  /** Nome do motorista. */
  @ApiPropertyOptional({ example: 'João da Silva' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  /** Número da CNH. */
  @ApiPropertyOptional({ example: '12345678900' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  license_number?: string;

  /** Categoria da CNH. */
  @ApiPropertyOptional({ example: 'D' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  license_category?: string;

  /** Veículo a associar (opcional). */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicle_id?: string;
}

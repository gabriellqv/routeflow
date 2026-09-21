import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Dados de entrada para criação de um novo usuário.
 */
export class RegisterDto {
  /** E-mail único que será usado como credencial. */
  @ApiProperty({ example: 'admin@routeflow.com' })
  @IsEmail()
  email: string;

  /** Nome de exibição do usuário. */
  @ApiProperty({ example: 'Administrador' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  /** Senha em texto puro; será armazenada apenas como hash. */
  @ApiProperty({ example: 'admin123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Dados de entrada para autenticação de um usuário.
 */
export class LoginDto {
  /** E-mail cadastrado do usuário. */
  @ApiProperty({ example: 'motorista@routeflow.dev' })
  @IsEmail()
  email: string;

  /** Senha em texto puro, validada contra o hash armazenado. */
  @ApiProperty({ example: 'senha-secreta' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

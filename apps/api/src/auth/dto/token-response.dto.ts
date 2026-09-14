import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta retornada após autenticação ou cadastro bem-sucedido.
 */
export class TokenResponseDto {
  /** Token JWT de acesso. */
  @ApiProperty({ description: 'Token JWT de acesso (Bearer).' })
  accessToken: string;
}

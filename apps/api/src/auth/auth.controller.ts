import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { TokenResponseDto } from './dto/token-response.dto.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * Controlador de autenticação.
 *
 * Expõe as rotas de cadastro, login e consulta do usuário autenticado.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Cria um novo usuário e retorna um token de acesso.
   *
   * @param dto Dados de cadastro.
   * @returns Token JWT do usuário recém-criado.
   */
  @Post('register')
  @ApiOperation({ summary: 'Cadastra um novo usuário' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TokenResponseDto })
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    const accessToken = await this.authService.register(dto);
    return { accessToken };
  }

  /**
   * Autentica um usuário e retorna um token de acesso.
   *
   * @param dto Credenciais de acesso.
   * @returns Token JWT do usuário autenticado.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica um usuário' })
  @ApiResponse({ status: HttpStatus.OK, type: TokenResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    const accessToken = await this.authService.login(dto);
    return { accessToken };
  }

  /**
   * Retorna os dados do usuário autenticado pelo token informado.
   *
   * @param user Usuário anexado à requisição pelo guard.
   * @returns Dados públicos do usuário autenticado.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuário autenticado' })
  profile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}

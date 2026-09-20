import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthenticatedUser } from './auth.types.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { UsersService } from '../users/users.service.js';

/** Custo do algoritmo bcrypt aplicado ao hash de senhas. */
const BCRYPT_ROUNDS = 12;

/**
 * Serviço responsável pelas regras de autenticação.
 *
 * Concentra o cadastro de usuários, a validação de credenciais e a emissão de
 * tokens JWT. Não expõe o hash de senha em nenhuma resposta.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Valida as credenciais e gera um token de acesso.
   *
   * @param credentials E-mail e senha informados.
   * @returns Token JWT de acesso.
   * @throws UnauthorizedException Quando o usuário não existe ou a senha é inválida.
   */
  async login(credentials: LoginDto): Promise<string> {
    const user = await this.usersService.findByEmail(credentials.email);

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      // Mensagem genérica para não revelar se o e-mail está cadastrado.
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueToken({ id: user.id, email: user.email });
  }

  /**
   * Cria um usuário e já emite seu token de acesso.
   *
   * @param data Dados de cadastro.
   * @returns Token JWT de acesso do usuário recém-criado.
   * @throws ConflictException Quando o e-mail já está cadastrado.
   */
  async register(data: RegisterDto): Promise<string> {
    const existing = await this.usersService.findByEmail(data.email);

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    return this.issueToken({ id: user.id, email: user.email });
  }

  /**
   * Verifica a assinatura de um token e extrai o usuário autenticado.
   *
   * @param token Token JWT (sem o prefixo `Bearer`).
   * @returns Usuário autenticado extraído do payload.
   * @throws UnauthorizedException Quando o token é inválido ou expirado.
   */
  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
      return { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  /**
   * Assina um token JWT com o payload do usuário.
   *
   * @param user Usuário autenticado.
   * @returns Token JWT assinado.
   */
  private issueToken(user: AuthenticatedUser): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, email: user.email });
  }
}

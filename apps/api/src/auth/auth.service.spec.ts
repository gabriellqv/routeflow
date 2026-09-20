import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };

  const passwordHash = bcrypt.hashSync('senha-secreta', 4);

  beforeEach(async () => {
    usersService = { findByEmail: vi.fn(), create: vi.fn() };
    jwtService = {
      signAsync: vi.fn().mockResolvedValue('token-assinado'),
      verifyAsync: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('deve retornar um token quando as credenciais são válidas', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        passwordHash,
      } as User);

      await expect(
        authService.login({ email: 'a@b.com', password: 'senha-secreta' }),
      ).resolves.toBe('token-assinado');
    });

    it('deve lançar UnauthorizedException quando o usuário não existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'naoexiste@b.com', password: 'senha-secreta' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando a senha é inválida', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        passwordHash,
      } as User);

      await expect(
        authService.login({ email: 'a@b.com', password: 'senha-errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('deve criar o usuário com a senha em hash e retornar um token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(
        (data: Pick<User, 'email' | 'name' | 'passwordHash'>) =>
          Promise.resolve({ id: 'user-1', ...data } as User),
      );

      const token = await authService.register({
        email: 'novo@b.com',
        name: 'Novo Usuário',
        password: 'senha-secreta',
      });

      expect(token).toBe('token-assinado');
      const created = usersService.create.mock.calls[0][0];
      expect(created.passwordHash).not.toBe('senha-secreta');
      expect(await bcrypt.compare('senha-secreta', created.passwordHash)).toBe(true);
    });

    it('deve lançar ConflictException quando o e-mail já está cadastrado', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'user-1' } as User);

      await expect(
        authService.register({ email: 'a@b.com', name: 'Existente', password: 'senha-secreta' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('deve retornar o usuário autenticado a partir do payload', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'a@b.com' });

      await expect(authService.verify('token-valido')).resolves.toEqual({
        id: 'user-1',
        email: 'a@b.com',
      });
    });

    it('deve lançar UnauthorizedException quando o token é inválido', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('token expirado'));

      await expect(authService.verify('token-invalido')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

/**
 * Serviço de acesso a dados de usuários.
 *
 * Encapsula as consultas à tabela `users`, permitindo que outros módulos
 * (como `auth`) dependam deste serviço em vez do repositório diretamente.
 */
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}

  /**
   * Busca um usuário pelo e-mail.
   *
   * @param email E-mail a ser pesquisado.
   * @returns O usuário encontrado ou `null` se não existir.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  /**
   * Busca um usuário pelo identificador.
   *
   * @param id Identificador do usuário.
   * @returns O usuário encontrado ou `null` se não existir.
   */
  findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Cria um novo usuário.
   *
   * @param data Dados do usuário (e-mail, nome e hash da senha).
   * @returns O usuário persistido.
   */
  create(data: Pick<User, 'email' | 'name' | 'passwordHash'>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entidade que representa um usuário autenticável do sistema.
 *
 * A senha é armazenada apenas como hash (bcrypt) e nunca em texto puro.
 */
@Entity('users')
export class User {
  /** Identificador único do usuário. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** E-mail único usado como credencial de acesso. */
  @Column({ type: 'text', unique: true })
  email: string;

  /** Nome de exibição do usuário. */
  @Column({ type: 'text' })
  name: string;

  /** Hash bcrypt da senha. */
  @Column({ type: 'text', name: 'password_hash' })
  passwordHash: string;

  /** Data de criação do registro. */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

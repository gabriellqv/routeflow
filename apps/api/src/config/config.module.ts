import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration.js';
import { envValidationSchema } from './env.validation.js';

/**
 * Módulo global de configuração da aplicação.
 *
 * Carrega as variáveis de ambiente dos arquivos `.env` (local do pacote e raiz
 * do monorepo), valida-as com o esquema Joi e disponibiliza o `ConfigService`
 * globalmente, sem a necessidade de importá-lo em cada módulo.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local', '../../.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        libraryOptions: {
          abortEarly: false,
          allowUnknown: true,
        },
      },
    }),
  ],
})
export class AppConfigModule {}

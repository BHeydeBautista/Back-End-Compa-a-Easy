import { Module } from '@nestjs/common';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { PendingRegistration } from './entities/pending-registration.entity';

type ExpiresIn = NonNullable<
  NonNullable<JwtModuleOptions['signOptions']>['expiresIn']
>;

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([PendingRegistration]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd =
          (config.get<string>('NODE_ENV') ?? 'development') === 'production';

        const secret =
          config.get<string>('JWT_SECRET') ??
          (!isProd ? 'dev_secret_change_me' : undefined);

        if (!secret) {
          throw new Error('JWT_SECRET is not set');
        }

        const expiresIn = (config.get<string>('JWT_EXPIRES_IN') ??
          '1d') as ExpiresIn;

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService],
})
export class AuthModule {}

import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CoursesModule } from './courses/courses.module';
import { GalleryModule } from './gallery/gallery.module';
import { MediaModule } from './media/media.module';
import { RanksModule } from './ranks/ranks.module';
import { UserCoursesModule } from './user-courses/user-courses.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MediaModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isProd =
          (config.get<string>('NODE_ENV') ?? 'development') === 'production';
        const dbSslEnv = (config.get<string>('DB_SSL') ?? '').toLowerCase();
        const useSsl = isProd || dbSslEnv === 'true' || dbSslEnv === '1';

        const dbSyncEnv = (config.get<string>('DB_SYNC') ?? '').toLowerCase();
        const forceSync = dbSyncEnv === 'true' || dbSyncEnv === '1';

        const sslOptions = useSsl
          ? ({ rejectUnauthorized: false } as const)
          : undefined;

        const common = {
          autoLoadEntities: true,
          synchronize: forceSync || !isProd,
        } as const;

        try {
          if (databaseUrl) {
            const parsed = new URL(databaseUrl);
            const dbName = parsed.pathname?.replace(/^\//, '') || '(no-db)';
            Logger.log(
              `TypeORM config: isProd=${isProd} forceSync=${forceSync} synchronize=${common.synchronize} ssl=${useSsl} host=${parsed.hostname} db=${dbName}`,
              'TypeOrmConfig',
            );
          } else {
            const host = config.get<string>('DB_HOST') ?? 'localhost';
            const port = Number(config.get<string>('DB_PORT') ?? 5432);
            const dbName = config.get<string>('DB_NAME') ?? 'app';
            Logger.log(
              `TypeORM config: isProd=${isProd} forceSync=${forceSync} synchronize=${common.synchronize} ssl=${useSsl} host=${host}:${port} db=${dbName}`,
              'TypeOrmConfig',
            );
          }
        } catch {
          Logger.log(
            `TypeORM config: isProd=${isProd} forceSync=${forceSync} synchronize=${common.synchronize} ssl=${useSsl} (details unavailable)`,
            'TypeOrmConfig',
          );
        }

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            ssl: sslOptions,
            ...common,
          };
        }

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST') ?? 'localhost',
          port: Number(config.get<string>('DB_PORT') ?? 5432),
          username: config.get<string>('DB_USER') ?? 'postgres',
          password: config.get<string>('DB_PASSWORD') ?? 'postgres',
          database: config.get<string>('DB_NAME') ?? 'app',
          ssl: sslOptions,
          ...common,
        };
      },
    }),
    UsersModule,
    AuthModule,
    AttendanceModule,
    RanksModule,
    CoursesModule,
    UserCoursesModule,
    GalleryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

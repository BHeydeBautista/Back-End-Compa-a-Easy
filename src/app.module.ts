import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { RanksModule } from './ranks/ranks.module';
import { UserCoursesModule } from './user-courses/user-courses.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isProd = (config.get<string>('NODE_ENV') ?? 'development') === 'production';

        const common = {
          autoLoadEntities: true,
          synchronize: !isProd,
        } as const;

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
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
          ...common,
        };
      },
    }),
    UsersModule,
    AuthModule,
    RanksModule,
    CoursesModule,
    UserCoursesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

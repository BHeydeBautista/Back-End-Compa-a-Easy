import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GalleryController } from './gallery.controller';
import { LatestMissionPhoto } from './entities/latest-mission-photo.entity';
import { GalleryService } from './gallery.service';

@Module({
  imports: [TypeOrmModule.forFeature([LatestMissionPhoto])],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}

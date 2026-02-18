import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../media/cloudinary.service';
import { LatestMissionPhoto } from './entities/latest-mission-photo.entity';

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(LatestMissionPhoto)
    private readonly repo: Repository<LatestMissionPhoto>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getLatest() {
    const rows = await this.repo.find({ order: { slot: 'ASC' } });
    return {
      images: (rows ?? []).map((r) => ({ publicId: r.publicId, slot: r.slot })),
    };
  }

  async replaceLatest(publicIds: string[]) {
    const normalized = (publicIds ?? [])
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);

    if (normalized.length < 3 || normalized.length > 4) {
      throw new BadRequestException('Debes enviar 3 o 4 imágenes.');
    }

    const unique = Array.from(new Set(normalized));
    if (unique.length !== normalized.length) {
      throw new BadRequestException('Las imágenes no pueden repetirse.');
    }

    for (const id of normalized) {
      if (!this.cloudinary.assertPublicIdAllowed(id)) {
        throw new BadRequestException('publicId inválido para Cloudinary.');
      }
    }

    const existing = await this.repo.find({ order: { slot: 'ASC' } });
    const oldIds = (existing ?? []).map((r) => r.publicId).filter(Boolean);

    await this.repo.clear();
    const next = normalized.map((publicId, idx) =>
      this.repo.create({ publicId, slot: idx + 1 }),
    );
    await this.repo.save(next);

    const toDelete = oldIds.filter((id) => !normalized.includes(id));
    await Promise.all(toDelete.map((id) => this.cloudinary.deleteImage(id)));

    return this.getLatest();
  }
}

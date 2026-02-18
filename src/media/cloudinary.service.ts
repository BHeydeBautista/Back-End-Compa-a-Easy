import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  isConfigured() {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );
  }

  getAllowedPrefix() {
    const prefix = (process.env.CLOUDINARY_ALLOWED_PREFIX ?? '').trim();
    return prefix.length ? prefix : null;
  }

  assertPublicIdAllowed(publicId: string) {
    const normalized = String(publicId ?? '').trim();
    if (!normalized) return false;

    const prefix = this.getAllowedPrefix();
    if (!prefix) return true;
    return normalized.startsWith(prefix);
  }

  async deleteImage(publicId: string) {
    if (!this.isConfigured()) {
      this.logger.warn('Cloudinary not configured; skipping delete');
      return;
    }

    const id = String(publicId ?? '').trim();
    if (!id) return;

    try {
      await cloudinary.uploader.destroy(id, {
        resource_type: 'image',
        invalidate: true,
      });
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary image: ${id}`);
      this.logger.debug(String(err));
    }
  }
}

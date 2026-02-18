import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    const cloudinaryUrl = (process.env.CLOUDINARY_URL ?? '').trim();
    if (cloudinaryUrl) {
      try {
        const parsed = new URL(cloudinaryUrl);
        const cloudName = parsed.hostname;
        const apiKey = decodeURIComponent(parsed.username);
        const apiSecret = decodeURIComponent(parsed.password);

        if (cloudName && apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
          });
          return;
        }

        this.logger.warn(
          'CLOUDINARY_URL is present but missing credentials; Cloudinary disabled',
        );
      } catch (err) {
        this.logger.warn('Invalid CLOUDINARY_URL; Cloudinary disabled');
        this.logger.debug(String(err));
      }
    }

    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY ?? '').trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET ?? '').trim();

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      return;
    }

    if (cloudName || apiKey || apiSecret) {
      this.logger.warn(
        'Partial Cloudinary env detected; Cloudinary disabled (expected CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)',
      );
    }
  }

  isConfigured() {
    const url = (process.env.CLOUDINARY_URL ?? '').trim();
    if (url) return true;

    return Boolean(
      (process.env.CLOUDINARY_CLOUD_NAME ?? '').trim() &&
        (process.env.CLOUDINARY_API_KEY ?? '').trim() &&
        (process.env.CLOUDINARY_API_SECRET ?? '').trim(),
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

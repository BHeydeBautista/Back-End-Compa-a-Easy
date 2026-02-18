import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { ReplaceLatestGalleryDto } from './dto/replace-latest-gallery.dto';
import { GalleryService } from './gallery.service';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get('latest')
  latest() {
    return this.gallery.getLatest();
  }

  @Put('latest')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EDITOR, UserRole.MODERATOR, UserRole.SUPER_ADMIN)
  replaceLatest(@Body() dto: ReplaceLatestGalleryDto) {
    return this.gallery.replaceLatest(dto.publicIds);
  }
}

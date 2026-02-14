import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { AddCoursePrerequisiteDto } from './dto/add-course-prerequisite.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CoursesService } from './courses.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(Number(id));
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(Number(id), dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.coursesService.remove(Number(id));
  }

  @Get(':id/prerequisites')
  @Roles(UserRole.SUPER_ADMIN)
  listPrerequisites(@Param('id') id: string) {
    return this.coursesService.listPrerequisites(Number(id));
  }

  @Post(':id/prerequisites')
  @Roles(UserRole.SUPER_ADMIN)
  addPrerequisite(
    @Param('id') id: string,
    @Body() dto: AddCoursePrerequisiteDto,
  ) {
    return this.coursesService.addPrerequisite(
      Number(id),
      dto.prerequisiteCourseId,
    );
  }

  @Delete(':id/prerequisites/:prerequisiteCourseId')
  @Roles(UserRole.SUPER_ADMIN)
  removePrerequisite(
    @Param('id') id: string,
    @Param('prerequisiteCourseId') prerequisiteCourseId: string,
  ) {
    return this.coursesService.removePrerequisite(
      Number(id),
      Number(prerequisiteCourseId),
    );
  }
}

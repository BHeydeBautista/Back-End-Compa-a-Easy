import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
	@IsOptional()
	@IsInt()
	@Min(0)
	missionAttendanceCount?: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	trainingAttendanceCount?: number;
}

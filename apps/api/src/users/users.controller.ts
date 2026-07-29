import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@koridor/shared';
import { IsOptional, IsString } from 'class-validator';
import type { RequestUser } from '../auth/types/request-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

class ListUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: RequestUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get()
  @RequirePermissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'List users (admin)' })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@koridor/shared';
import { SystemRole } from '@prisma/client';
import type { RequestUser } from '../auth/types/request-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('assign')
  @RequirePermissions(Permission.ADMIN_ALL)
  @ApiOperation({ summary: 'Assign a system role (admin)' })
  assign(@CurrentUser() user: RequestUser, @Body() dto: AssignRoleDto) {
    return this.rolesService.assign(user.id, dto.userId, dto.role);
  }

  @Delete(':userId/:role')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.ADMIN_ALL)
  @ApiOperation({ summary: 'Remove a system role (admin)' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('role', new ParseEnumPipe(SystemRole)) role: SystemRole,
  ) {
    return this.rolesService.remove(user.id, userId, role);
  }

  @Get('me/permissions')
  @ApiOperation({ summary: 'Get current user roles and permissions' })
  myPermissions(@CurrentUser() user: RequestUser) {
    return this.rolesService.getMyPermissions(user.id);
  }
}

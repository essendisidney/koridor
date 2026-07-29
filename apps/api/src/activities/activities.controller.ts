import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { RequestUser } from '../auth/types/request-user';
import { ActivitiesService } from './activities.service';

class ListActivitiesQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;
}

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Activity timeline for current user / organisation' })
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListActivitiesQueryDto,
  ) {
    return this.activitiesService.listForUser({
      userId: user.id,
      organisationId: query.organisationId ?? user.organisationId,
      page: query.page,
      limit: query.limit,
      type: query.type,
    });
  }
}

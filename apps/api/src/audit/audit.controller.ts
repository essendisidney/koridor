import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@koridor/shared';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuditService } from './audit.service';

class ListAuditQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'List audit logs (permission-gated)' })
  list(@Query() query: ListAuditQueryDto) {
    return this.auditService.list({
      page: query.page,
      limit: query.limit,
      organisationId: query.organisationId,
      actorId: query.actorId,
      action: query.action,
      entityType: query.entityType,
    });
  }
}

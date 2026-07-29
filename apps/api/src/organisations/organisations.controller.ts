import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestUser } from '../auth/types/request-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { OrganisationsService } from './organisations.service';

@ApiTags('organisations')
@ApiBearerAuth()
@Controller('organisations')
export class OrganisationsController {
  constructor(private readonly organisationsService: OrganisationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create organisation and become owner',
  })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateOrganisationDto,
  ) {
    return this.organisationsService.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get primary organisation for current user' })
  getMe(@CurrentUser() user: RequestUser) {
    return this.organisationsService.getPrimary(user.id);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List organisations for current user' })
  getMine(@CurrentUser() user: RequestUser) {
    return this.organisationsService.getMine(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organisation (owner/admin)' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationDto,
  ) {
    return this.organisationsService.update(id, user.id, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organisation members' })
  listMembers(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organisationsService.listMembers(id, user.id);
  }

  @Post(':id/invites')
  @ApiOperation({ summary: 'Invite a member to the organisation' })
  invite(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organisationsService.inviteMember(id, user.id, dto);
  }
}

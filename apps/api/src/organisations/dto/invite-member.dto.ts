import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganisationMemberRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    enum: OrganisationMemberRole,
    default: OrganisationMemberRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(OrganisationMemberRole)
  role?: OrganisationMemberRole;
}

import { ApiProperty } from '@nestjs/swagger';
import { SystemRole } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: SystemRole })
  @IsEnum(SystemRole)
  role!: SystemRole;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'exporter@demo.koridor.io' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Demo123!' })
  @IsString()
  @MinLength(1)
  password!: string;
}

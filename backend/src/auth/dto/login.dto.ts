import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'reviewer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Reviewer@12345' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

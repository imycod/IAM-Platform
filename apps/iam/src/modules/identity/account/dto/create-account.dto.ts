import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Length(26, 26)
  userId: string;

  @IsString()
  @Length(1, 50)
  providerId: string;

  @IsString()
  @Length(1, 255)
  accountId: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  scope?: string;
}

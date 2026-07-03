import { IsOptional, IsString, Length, MinLength } from 'class-validator';

/** 为已有用户开通邮箱密码登录；用户资料请在「用户管理」维护。 */
export class CreateCredentialAdminDto {
  @IsString()
  @Length(26, 26)
  userId: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

/** 仅重置凭证密码；邮箱/姓名/手机请在「用户管理」修改。 */
export class UpdateCredentialAdminDto {
  @IsString()
  @MinLength(6)
  password: string;
}

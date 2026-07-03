import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class CreateApplicationRoleDto {
    @IsString()
    @Length(1, 100)
    name: string;

    @IsString()
    @Length(1, 50)
    code: string;

    /** 由路由参数注入 */
    @IsOptional()
    @IsString()
    applicationId?: string;
}
import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class UpdateApplicationPortalSessionTtlDto {
  /** NULL / 省略表示清除覆盖，回退全局默认 */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(60)
  @Max(365 * 24 * 60 * 60)
  portalSessionTtlSeconds?: number | null;
}

import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DeviceType } from '../entities/device.entity';

export class CreateDeviceDto {
  @IsString()
  @Length(26, 26)
  userId: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  deviceName?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  os?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  browser?: string;

  @IsOptional()
  @IsString()
  @Length(0, 128)
  fingerprint?: string;

  @IsOptional()
  trusted?: boolean;
}

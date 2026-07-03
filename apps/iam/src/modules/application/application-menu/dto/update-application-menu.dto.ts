import { PartialType } from '@nestjs/mapped-types';
import { CreateApplicationMenuDto } from './create-application-menu.dto';

export class UpdateApplicationMenuDto extends PartialType(CreateApplicationMenuDto) {}

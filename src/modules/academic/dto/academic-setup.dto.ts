import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionInSetupDto } from './session-in-setup.dto';
import { CreateAcademicYearDto } from './create-academic-year.dto';
import { CreateBatchDto } from './create-batch.dto';

export class AcademicSetupDto {
  @ValidateNested()
  @Type(() => CreateAcademicYearDto)
  year!: CreateAcademicYearDto;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => SessionInSetupDto)
  sessions!: SessionInSetupDto[];

  @ValidateNested()
  @Type(() => CreateBatchDto)
  batch!: CreateBatchDto;
}

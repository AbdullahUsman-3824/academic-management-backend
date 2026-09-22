import {
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SectionStrategy {
  SINGLE = 'single',
  SPLIT_50_50 = 'split_50_50',
  CUSTOM = 'custom',
}

/**
 * Used when strategy = 'custom'.
 * Describes how students from one batch should be split across named sections.
 */
export class BatchSectionSplitDto {
  @IsUUID()
  batchId!: string;

  /**
   * Each entry is one target section.
   * name: section name (e.g. "A")
   * studentCount: how many students go into this section
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionSlotDto)
  sections!: SectionSlotDto[];
}

export class SectionSlotDto {
  @IsUUID()
  @IsOptional()
  sectionId?: string; // reference an existing section, or leave blank to create

  @IsOptional()
  name?: string; // used when creating a new section

  @IsInt()
  @Min(1)
  studentCount!: number;
}

export class AssignSectionsDto {
  @IsEnum(SectionStrategy)
  strategy!: SectionStrategy;

  /**
   * Required when strategy = 'custom'.
   * One entry per batch that needs custom splitting.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchSectionSplitDto)
  customSplits?: BatchSectionSplitDto[];
}

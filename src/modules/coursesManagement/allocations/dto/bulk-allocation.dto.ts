import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class BulkAllocationDto {
  @IsUUID('4')
  facultyId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(15)
  @IsUUID('4', { each: true })
  assignmentIds!: string[];

  @IsUUID('4')
  sectionId!: string;
}

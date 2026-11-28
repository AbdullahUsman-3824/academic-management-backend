import { IsUUID } from 'class-validator';

export class UpdateAllocationDto {
  @IsUUID('4')
  facultyId!: string;
}

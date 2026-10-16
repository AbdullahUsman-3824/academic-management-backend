import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateFacultyStatusDto {
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status!: 'active' | 'inactive';
}

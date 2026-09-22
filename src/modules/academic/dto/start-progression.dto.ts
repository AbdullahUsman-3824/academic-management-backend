import { IsUUID } from 'class-validator';

export class StartProgressionDto {
  @IsUUID()
  academicSessionId!: string;
}

import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateVetVisitDto {
  @IsDateString()
  visitDate: string;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  vetName?: string;

  @IsDateString()
  @IsOptional()
  nextVisit?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;
}

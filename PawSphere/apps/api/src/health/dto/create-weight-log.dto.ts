import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateWeightLogDto {
  @IsNumber()
  @Min(0.1)
  weight: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

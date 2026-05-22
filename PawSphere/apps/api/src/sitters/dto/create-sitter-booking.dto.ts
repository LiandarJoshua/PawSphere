import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateSitterBookingDto {
  @IsString()
  sitterId: string;

  @IsString()
  petId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

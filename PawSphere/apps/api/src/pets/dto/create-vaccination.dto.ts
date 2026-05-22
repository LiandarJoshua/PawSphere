import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVaccinationDto {
  @ApiProperty({ example: 'Rabies' })
  @IsString()
  vaccineName: string;

  @ApiProperty({ example: '2024-01-10' })
  @IsDateString()
  administeredAt: string;

  @ApiPropertyOptional({ example: '2025-01-10' })
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @ApiPropertyOptional({ example: 'No adverse reactions observed.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

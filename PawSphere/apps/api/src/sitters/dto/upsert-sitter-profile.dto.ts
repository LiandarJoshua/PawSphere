import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, Min, Max } from 'class-validator';

export class UpsertSitterProfileDto {
  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsNumber()
  @Min(0)
  @Max(50)
  experience: number;

  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  dailyRate?: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsArray()
  @IsOptional()
  specialties?: string[];
}

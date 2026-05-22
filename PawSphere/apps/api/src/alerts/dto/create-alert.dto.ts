import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAlertDto {
  @ApiProperty({ example: 'pet-uuid-here' })
  @IsString()
  petId: string;

  @ApiPropertyOptional({ example: 25.2048 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  lastSeenLat?: number;

  @ApiPropertyOptional({ example: 55.2708 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  lastSeenLng?: number;

  @ApiPropertyOptional({ example: 'Near Jumeirah Beach Park, Dubai' })
  @IsOptional()
  @IsString()
  lastSeenAddress?: string;

  @ApiPropertyOptional({ example: 'Brown Labrador with red collar, very friendly.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '+971 50 123 4567' })
  @IsOptional()
  @IsString()
  contactPhone?: string;
}

import { IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '@prisma/client';

export class NearbyQueryDto {
  @ApiProperty({ example: 25.2048, description: 'Latitude' })
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 55.2708, description: 'Longitude' })
  @Type(() => Number)
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ example: 10, description: 'Search radius in km (default 10, max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  radius?: number;

  @ApiPropertyOptional({ enum: ServiceType, description: 'Filter by service type' })
  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType;
}

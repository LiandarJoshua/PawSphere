import { IsString, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'provider-uuid-here' })
  @IsString()
  providerId: string;

  @ApiProperty({ example: 'pet-uuid-here' })
  @IsString()
  petId: string;

  @ApiProperty({ example: '2026-06-15T10:00:00Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ example: 150, description: 'Total price in AED' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiPropertyOptional({ example: 'Please use hypoallergenic shampoo.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'time-slot-uuid-here', description: 'Optional time slot ID to book a specific appointment slot' })
  @IsOptional()
  @IsString()
  timeSlotId?: string;
}

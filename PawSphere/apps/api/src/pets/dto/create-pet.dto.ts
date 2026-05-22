import { IsString, IsEnum, IsOptional, IsDateString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Species } from '@prisma/client';

export class CreatePetDto {
  @ApiProperty({ example: 'Mochi' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: Species, default: Species.DOG })
  @IsOptional()
  @IsEnum(Species)
  species?: Species;

  @ApiPropertyOptional({ example: 'Golden Retriever' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ example: '2022-03-15' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Allergic to chicken protein' })
  @IsOptional()
  @IsString()
  medicalInfo?: string;
}

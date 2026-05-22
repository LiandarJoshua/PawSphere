import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateSitterReviewDto {
  @IsString()
  sitterId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

import { IsUUID, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class CreateProviderReviewDto {
  @IsUUID() providerId: string;
  @IsOptional() @IsUUID() bookingId?: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() comment?: string;
}

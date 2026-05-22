import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class LogActivityDto {
  @IsString() type: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() @Min(0) durationMin?: number;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsString() loggedAt?: string;
}

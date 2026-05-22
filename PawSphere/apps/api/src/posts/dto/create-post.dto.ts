import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsUrl, Min, ArrayMaxSize } from 'class-validator';
import { PostCategory } from '@prisma/client';

export class CreatePostDto {
  @IsEnum(PostCategory)
  category: PostCategory;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  petName?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  contactInfo?: string;

  @IsString()
  @IsOptional()
  itemName?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(4)
  @IsOptional()
  imageUrls?: string[];
}

import { IsInt, Min, Max, IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateResultDto {
  @IsOptional() @IsInt() @Min(0) @Max(999) winning_number?: number;
  @IsOptional() prize_2?: number | null;
  @IsOptional() prize_3?: number | null;
  @IsOptional() prize_4?: number | null;
  @IsOptional() prize_5?: number | null;
  @IsOptional() @IsArray() complementary_numbers?: number[];
  @IsOptional() @IsString() document_url?: string | null;
}

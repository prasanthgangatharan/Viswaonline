import { IsUUID, IsInt, Min, Max, IsOptional, IsString, IsArray } from 'class-validator';

export class DeclareResultDto {
  @IsUUID() lottery_id: string;
  @IsInt() @Min(0) @Max(999) winning_number: number;
  @IsOptional() @IsInt() @Min(0) @Max(999) prize_2?: number;
  @IsOptional() @IsInt() @Min(0) @Max(999) prize_3?: number;
  @IsOptional() @IsInt() @Min(0) @Max(999) prize_4?: number;
  @IsOptional() @IsInt() @Min(0) @Max(999) prize_5?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(999, { each: true }) complementary_numbers?: number[];
  @IsOptional() @IsString() document_url?: string;
}

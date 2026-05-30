import { IsString, IsDateString, IsOptional, MinLength, MaxLength, Min, Max, IsInt } from 'class-validator';

export class CreateLotteryDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsDateString() draw_time: string;
  @IsOptional() @IsInt() @Min(1) @Max(120) stop_betting_minutes?: number;
  @IsOptional() @IsInt() @Min(1) tab1_max?: number;
  @IsOptional() @IsInt() @Min(1) tab2_max?: number;
  @IsOptional() @IsInt() @Min(1) tab3_max?: number;
}

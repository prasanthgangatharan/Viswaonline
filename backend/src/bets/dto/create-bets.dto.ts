import { IsString, IsArray, ValidateNested, IsIn, IsInt, Min, Max, IsUUID, ArrayMinSize, ArrayMaxSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class BetEntryDto {
  @IsIn(['A', 'B', 'C', 'AB', 'BC', 'AC', 'SUPER', 'BOX']) type: string;
  @IsInt() @Min(0) @Max(999) number: number;
  @IsInt() @Min(1) @Max(100000) count: number;
  @IsIn([1, 2, 3]) tab: number;
  @IsOptional() @IsInt() @Min(0) overflow_count?: number;
}

export class CreateBetsDto {
  @IsUUID() lottery_id: string;
  @IsString() ticket_id: string;
  @IsOptional() @IsString() customer_name?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => BetEntryDto) entries: BetEntryDto[];
}

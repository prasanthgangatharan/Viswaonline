import { IsUUID, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class DeclareResultDto {
  @IsUUID() lottery_id: string;
  @IsInt() @Min(0) @Max(999) winning_number: number;
  @IsOptional() @IsString() document_url?: string;
}

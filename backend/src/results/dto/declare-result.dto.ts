import { IsUUID, IsInt, Min, Max } from 'class-validator';

export class DeclareResultDto {
  @IsUUID() lottery_id: string;
  @IsInt() @Min(0) @Max(999) winning_number: number;
}

import { IsString, MinLength, MaxLength, Matches, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username may only contain letters, numbers and underscores' })
  username: string;

  @IsString() @MinLength(6) @MaxLength(100) password: string;

  @IsNumber() @Min(0) tab1_price: number;
  @IsNumber() @Min(0) tab2_price: number;
  @IsNumber() @Min(0) tab3_price: number;
}

export class UpdateAgentDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username may only contain letters, numbers and underscores' })
  username?: string;

  @IsOptional() @IsString() @MinLength(6) @MaxLength(100) password?: string;

  @IsOptional() @IsNumber() @Min(0) tab1_price?: number;
  @IsOptional() @IsNumber() @Min(0) tab2_price?: number;
  @IsOptional() @IsNumber() @Min(0) tab3_price?: number;
}

export class ResetPasswordDto {
  @IsString() @MinLength(6) @MaxLength(100) password: string;
}

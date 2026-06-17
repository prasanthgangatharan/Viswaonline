import { Controller, Post, Patch, Body, Request, HttpCode } from '@nestjs/common';
import { IsString, MinLength, MaxLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public, Roles } from './roles.decorator';

class LoginDto {
  @IsString() @MinLength(1) @MaxLength(50) username: string;
  @IsString() @MinLength(1) @MaxLength(100) password: string;
}

class ChangePasswordDto {
  @IsString() @MinLength(1) currentPassword: string;
  @IsString() @MinLength(6) @MaxLength(100) newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('admin/login')
  @HttpCode(200)
  async adminLogin(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.username, body.password, 'admin');
    return this.authService.generateToken(user);
  }

  @Public()
  @Post('agent/login')
  @HttpCode(200)
  async agentLogin(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.username, body.password, 'agent');
    return this.authService.generateAgentToken(user);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Patch('admin/change-password')
  @Roles('admin')
  @HttpCode(200)
  async changeAdminPassword(@Request() req: any, @Body() body: ChangePasswordDto) {
    return this.authService.changeAdminPassword(req.user.id, body.currentPassword, body.newPassword);
  }
}

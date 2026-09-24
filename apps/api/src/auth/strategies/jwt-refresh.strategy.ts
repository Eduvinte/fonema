import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { TokenPayload } from '../../common/interfaces/jwt-user.interface';
import { REFRESH_COOKIE } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: (req: Request) =>
        (req?.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(
    _req: Request,
    payload: TokenPayload,
  ): { sub: string; email: string } {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException();
    }
    return { sub: payload.sub, email: payload.email };
  }
}

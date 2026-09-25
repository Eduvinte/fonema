import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Requiere permisos de administrador');
    }
    return true;
  }
}

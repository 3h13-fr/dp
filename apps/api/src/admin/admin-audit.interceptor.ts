import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const handler = context.getHandler();
    const controller = context.getClass();

    const action = `${controller.name}.${handler.name}`;
    const resource = controller.name.replace('Controller', '');

    return next.handle().pipe(
      tap({
        next: async (value) => {
          // Log successful admin action
          if (user?.id && user?.role === 'ADMIN') {
            try {
              await this.prisma.adminAction.create({
                data: {
                  adminId: user.id,
                  action,
                  resource,
                  resourceId: request.params?.id || request.body?.id || 'unknown',
                  details: {
                    method: request.method,
                    path: request.url,
                    params: request.params,
                    body: this.sanitizeBody(request.body),
                  } as any,
                  result: 'success',
                },
              });
            } catch (error) {
              // Don't fail the request if audit logging fails
              console.error('Failed to log admin action', error);
            }
          }
        },
        error: async (error) => {
          // Log failed admin action
          if (user?.id && user?.role === 'ADMIN') {
            try {
              await this.prisma.adminAction.create({
                data: {
                  adminId: user.id,
                  action,
                  resource,
                  resourceId: request.params?.id || request.body?.id || 'unknown',
                  details: {
                    method: request.method,
                    path: request.url,
                    params: request.params,
                    body: this.sanitizeBody(request.body),
                  } as any,
                  result: 'failed',
                  error: error.message || String(error),
                },
              });
            } catch (auditError) {
              // Don't fail the request if audit logging fails
              console.error('Failed to log admin action', auditError);
            }
          }
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    // Remove sensitive fields
    if (sanitized.password) delete sanitized.password;
    if (sanitized.token) delete sanitized.token;
    if (sanitized.secret) delete sanitized.secret;
    return sanitized;
  }
}

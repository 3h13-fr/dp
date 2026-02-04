import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'Mobility Platform API',
      version: '1.0',
      docs: '/health',
      endpoints: {
        health: '/health',
        auth: '/auth/login, /auth/me',
        listings: '/listings',
        bookings: '/bookings',
      },
    };
  }
}

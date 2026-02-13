import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingType } from 'database';

@Controller('categories')
export class CategoriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getCategories(@Query('vertical') vertical?: ListingType) {
    const where = vertical ? { vertical } : {};
    const categories = await this.prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        order: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return categories;
  }
}

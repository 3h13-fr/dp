import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingType } from 'database';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

@Injectable()
export class AdminCategoriesService {
  constructor(private prisma: PrismaService) {}

  async getCategories(vertical?: ListingType) {
    const where = vertical ? { vertical } : {};
    return this.prisma.category.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async createCategory(data: {
    name: string;
    vertical: ListingType;
    imageUrl?: string | null;
    order?: number;
  }) {
    const slug = generateSlug(data.name);

    // Check if slug already exists for this vertical
    const existing = await this.prisma.category.findUnique({
      where: {
        vertical_slug: {
          vertical: data.vertical,
          slug,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `A category with the slug "${slug}" already exists for this vertical`,
      );
    }

    return this.prisma.category.create({
      data: {
        name: data.name,
        slug,
        vertical: data.vertical,
        imageUrl: data.imageUrl ?? null,
        order: data.order ?? 0,
      },
    });
  }

  async updateCategory(
    id: string,
    data: {
      name?: string;
      imageUrl?: string | null;
      order?: number;
    },
  ) {
    const category = await this.getCategoryById(id);

    let slug = category.slug;
    if (data.name && data.name !== category.name) {
      slug = generateSlug(data.name);

      // Check if new slug already exists for this vertical
      const existing = await this.prisma.category.findUnique({
        where: {
          vertical_slug: {
            vertical: category.vertical,
            slug,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `A category with the slug "${slug}" already exists for this vertical`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name, slug }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.getCategoryById(id);

    // Check if any listings are using this category
    const listingsCount = await this.prisma.listingCategory.count({
      where: { categoryId: id },
    });

    if (listingsCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${listingsCount} listing(s) are using this category`,
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}

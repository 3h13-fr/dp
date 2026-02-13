import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ListingType } from 'database';
import { AdminCategoriesService } from './admin-categories.service';
import { IsEnum, IsOptional, IsString, IsUrl, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(ListingType)
  vertical: ListingType;

  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}

@Controller('admin/categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminCategoriesController {
  constructor(private categoriesService: AdminCategoriesService) {}

  @Get()
  async getCategories(@Query('vertical') vertical?: ListingType) {
    return this.categoriesService.getCategories(vertical);
  }

  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  @Post()
  async createCategory(@Body() body: CreateCategoryDto) {
    return this.categoriesService.createCategory(body);
  }

  @Patch(':id')
  async updateCategory(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.updateCategory(id, body);
  }

  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}

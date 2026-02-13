'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { S3Image } from '@/components/S3Image';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  order: number;
};

type CategoryListProps = {
  categories: Category[];
  vertical: 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';
  onRefresh: () => void;
  onEdit: (category: Category) => void;
};

export function CategoryList({ categories, vertical, onRefresh, onEdit }: CategoryListProps) {
  const t = useTranslations('admin.categories');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDeletingId(id);
    setConfirmDeleteId(null);

    try {
      const res = await apiFetch(`/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete category');
      }

      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('noCategories')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className="relative group border border-border rounded-lg p-3 hover:shadow-md transition-shadow"
        >
          <div className="relative w-full aspect-square mb-2 bg-muted rounded overflow-hidden">
            {category.imageUrl ? (
              <S3Image
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-center mb-2">{category.name}</p>
          <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="text-xs text-primary hover:underline"
            >
              {t('editCategory')}
            </button>
            <span className="text-muted-foreground">•</span>
            <button
              type="button"
              onClick={() => handleDelete(category.id)}
              disabled={deletingId === category.id}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              {confirmDeleteId === category.id ? t('confirmDelete') : deletingId === category.id ? t('deleting') : t('deleteCategory')}
            </button>
          </div>
          {confirmDeleteId === category.id && (
            <div className="absolute inset-0 bg-white border-2 border-red-500 rounded-lg p-2 flex flex-col items-center justify-center z-10">
              <p className="text-xs text-center mb-2">{t('confirmDeleteDescription')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs px-2 py-1 border rounded"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(category.id)}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                >
                  {t('deleteCategory')}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

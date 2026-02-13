'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { CategoryForm } from '@/components/admin/CategoryForm';
import { CategoryList } from '@/components/admin/CategoryList';

type Category = {
  id: string;
  name: string;
  slug: string;
  vertical: 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';
  imageUrl?: string | null;
  order: number;
};

type Vertical = 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';

export default function AdminCategoriesPage() {
  const t = useTranslations('admin.categories');
  const [activeVertical, setActiveVertical] = useState<Vertical>('CAR_RENTAL');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/categories?vertical=${activeVertical}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [activeVertical]);

  const handleSave = () => {
    setShowForm(false);
    setEditingCategory(null);
    loadCategories();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const verticalLabels: Record<Vertical, string> = {
    CAR_RENTAL: t('location'),
    MOTORIZED_EXPERIENCE: t('experience'),
    CHAUFFEUR: t('ride'),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-2">
          {(Object.keys(verticalLabels) as Vertical[]).map((vertical) => (
            <button
              key={vertical}
              type="button"
              onClick={() => {
                setActiveVertical(vertical);
                setShowForm(false);
                setEditingCategory(null);
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeVertical === vertical
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {verticalLabels[vertical]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {showForm ? (
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">
            {editingCategory ? t('editCategory') : t('addCategory')}
          </h2>
          <CategoryForm
            category={editingCategory}
            vertical={activeVertical}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {verticalLabels[activeVertical]} - {categories.length} {categories.length === 1 ? 'catégorie' : 'catégories'}
            </h2>
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90"
            >
              {t('addCategory')}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t('loading')}</p>
            </div>
          ) : (
            <CategoryList
              categories={categories}
              vertical={activeVertical}
              onRefresh={loadCategories}
              onEdit={handleEdit}
            />
          )}
        </div>
      )}
    </div>
  );
}

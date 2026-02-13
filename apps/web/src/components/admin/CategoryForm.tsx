'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, getToken } from '@/lib/api';
import { S3Image } from '@/components/S3Image';

type Category = {
  id?: string;
  name: string;
  slug?: string;
  vertical: 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';
  imageUrl?: string | null;
  order?: number;
};

type CategoryFormProps = {
  category?: Category | null;
  vertical: 'CAR_RENTAL' | 'MOTORIZED_EXPERIENCE' | 'CHAUFFEUR';
  onSave: () => void;
  onCancel: () => void;
};

async function uploadImage(file: File): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  
  const res = await apiFetch('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({
      purpose: 'category_image',
      contentType: file.type || 'image/jpeg',
      filename: file.name,
    }),
  });
  
  const data = await res.json();
  if (!data?.uploadUrl || !data?.publicUrl) {
    throw new Error('Upload not configured');
  }
  
  const putRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'image/jpeg' },
  });
  
  if (!putRes.ok) throw new Error('Upload failed');
  return data.publicUrl;
}

export function CategoryForm({ category, vertical, onSave, onCancel }: CategoryFormProps) {
  const t = useTranslations('admin.categories');
  const [name, setName] = useState(category?.name || '');
  const [order, setOrder] = useState(category?.order?.toString() || '0');
  const [imageUrl, setImageUrl] = useState<string | null>(category?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const url = await uploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const data = {
        name: name.trim(),
        vertical,
        imageUrl,
        order: parseInt(order, 10) || 0,
      };

      if (category?.id) {
        await apiFetch(`/admin/categories/${category.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await apiFetch('/admin/categories', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="category-name" className="block text-sm font-medium mb-1">
          {t('categoryName')}
        </label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="category-order" className="block text-sm font-medium mb-1">
          {t('categoryOrder')}
        </label>
        <input
          id="category-order"
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder={t('orderPlaceholder')}
          min="0"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          {t('categoryImage')}
        </label>
        {imageUrl ? (
          <div className="space-y-2">
            <div className="relative w-32 h-32 border border-border rounded-lg overflow-hidden">
              <S3Image
                src={imageUrl}
                alt={name || 'Category'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {t('changeImage')}
              </button>
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="text-sm text-red-600 hover:underline"
              >
                {t('removeImage')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {uploading ? t('saving') : t('uploadImage')}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useTranslations } from 'next-intl';

type EditableSectionProps = {
  label: string;
  children: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  error?: string;
};

export function EditableSection({
  label,
  children,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving = false,
  error,
}: EditableSectionProps) {
  const t = useTranslations('hostNav');
  const tCommon = useTranslations('common');

  const handleSave = async () => {
    try {
      await onSave();
    } catch (err) {
      // Error is handled by parent component
    }
  };

  return (
    <section className="mt-6 rounded-lg border border-border">
      <div className={`flex items-center justify-between p-4 ${isEditing ? 'pb-2' : ''}`}>
        <h2 className="text-lg font-semibold">{label}</h2>
        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-black underline hover:no-underline"
          >
            {t('modify') || 'Modifier'}
          </button>
        )}
      </div>

      {isEditing && (
        <div className="border-t p-4 transition-all duration-200">
          {children}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:opacity-50"
            >
              {saving ? t('saving') || tCommon('saving') || 'Saving...' : t('save') || tCommon('save') || 'Save'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {tCommon('cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { S3Image } from '@/components/S3Image';

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  order: number;
};

type CategorySelectorProps = {
  categories: Category[];
  selectedCategoryIds: string[];
  onSelectionChange: (categoryIds: string[]) => void;
  disabled?: boolean;
};

export function CategorySelector({
  categories,
  selectedCategoryIds,
  onSelectionChange,
  disabled = false,
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort categories based on search query
  const filteredCategories = useMemo(() => {
    let filtered = categories;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = categories.filter(
        (cat) => cat.name.toLowerCase().includes(query) || cat.slug.toLowerCase().includes(query)
      );
    }
    // Sort: selected first, then by order, then by name
    return [...filtered].sort((a, b) => {
      const aSelected = selectedCategoryIds.includes(a.id);
      const bSelected = selectedCategoryIds.includes(b.id);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }, [categories, searchQuery, selectedCategoryIds]);

  // Get selected categories
  const selectedCategories = useMemo(() => {
    return categories.filter((cat) => selectedCategoryIds.includes(cat.id));
  }, [categories, selectedCategoryIds]);

  const toggleCategory = (categoryId: string) => {
    if (disabled) return;
    
    const isSelected = selectedCategoryIds.includes(categoryId);
    const newSelection = isSelected
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    
    onSelectionChange(newSelection);
  };

  const removeCategory = (categoryId: string) => {
    if (disabled) return;
    onSelectionChange(selectedCategoryIds.filter((id) => id !== categoryId));
  };

  const clearAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Header avec compteur et actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Catégories sélectionnées
          </h3>
          {selectedCategoryIds.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {selectedCategoryIds.length}
            </span>
          )}
        </div>
        {selectedCategoryIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tout désélectionner
          </button>
        )}
      </div>

      {/* Catégories sélectionnées (chips) */}
      {selectedCategories.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-3">
          {selectedCategories.map((category) => (
            <div
              key={category.id}
              className="group flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 transition-colors hover:bg-primary/10"
            >
              {category.imageUrl && (
                <S3Image
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              <span className="text-sm font-medium text-foreground">{category.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCategory(category.id)}
                  className="ml-1 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  aria-label={`Retirer ${category.name}`}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune catégorie sélectionnée. Sélectionnez-en ci-dessous.
          </p>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une catégorie..."
          disabled={disabled}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pl-10 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label="Effacer la recherche"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Grille de catégories */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredCategories.map((category) => {
            const isSelected = selectedCategoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                disabled={disabled}
                className={`group relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                {/* Indicateur de sélection */}
                {isSelected && (
                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}

                {/* Image de la catégorie */}
                <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
                  {category.imageUrl ? (
                    <S3Image
                      src={category.imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Nom de la catégorie */}
                <span
                  className={`text-center text-sm font-medium transition-colors ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? `Aucune catégorie trouvée pour "${searchQuery}"`
              : 'Aucune catégorie disponible'}
          </p>
        </div>
      )}

      {/* Message d'aide */}
      {categories.length > 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Vous pouvez sélectionner plusieurs catégories pour ce véhicule. Cliquez sur une
          catégorie pour l'ajouter ou la retirer.
        </p>
      )}
    </div>
  );
}

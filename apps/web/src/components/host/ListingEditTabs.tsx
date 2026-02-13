'use client';

type Tab = 'vehicle' | 'location' | 'pricing' | 'insurance' | 'availability' | 'rules' | 'photos';

type ListingEditTabsProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  hasVehicle: boolean;
};

export function ListingEditTabs({ activeTab, onTabChange, hasVehicle }: ListingEditTabsProps) {
  const tabs: Array<{ id: Tab; label: string; show: boolean }> = [
    { id: 'vehicle' as Tab, label: 'Véhicule', show: hasVehicle },
    { id: 'location' as Tab, label: 'Localisation & remise', show: true },
    { id: 'pricing' as Tab, label: 'Tarifs', show: true },
    { id: 'insurance' as Tab, label: 'Assurances', show: true },
    { id: 'rules' as Tab, label: 'Conditions & règles', show: true },
    { id: 'availability' as Tab, label: 'Disponibilités', show: true },
    { id: 'photos' as Tab, label: 'Photos et description', show: true },
  ].filter((tab) => tab.show) as Array<{ id: Tab; label: string; show: boolean }>;

  return (
    <div className="border-b border-neutral-200">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-neutral-200 text-black'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-150 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

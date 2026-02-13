'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ActiveMarketsData = {
  countryCodes: string[];
  bookingsAllowedCountryCodes: string[];
};

export function useActiveMarkets(): ActiveMarketsData {
  const [data, setData] = useState<ActiveMarketsData>({
    countryCodes: [],
    bookingsAllowedCountryCodes: [],
  });

  useEffect(() => {
    fetch(`${API_URL}/markets/active-visible`)
      .then((res) => res.json())
      .then((d: Partial<ActiveMarketsData>) => {
        setData({
          countryCodes: Array.isArray(d?.countryCodes) ? d.countryCodes : [],
          bookingsAllowedCountryCodes: Array.isArray(d?.bookingsAllowedCountryCodes)
            ? d.bookingsAllowedCountryCodes
            : [],
        });
      })
      .catch(() => setData({ countryCodes: [], bookingsAllowedCountryCodes: [] }));
  }, []);

  return data;
}

export function useActiveMarketCountryCodes(): string[] {
  return useActiveMarkets().countryCodes;
}

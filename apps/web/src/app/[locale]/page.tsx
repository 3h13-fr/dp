import { useTranslations } from 'next-intl';
import { SearchBar } from '@/components/SearchBar';

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{t('subtitle')}</p>
      </div>
      <div className="mx-auto mt-10 w-full max-w-2xl">
        <SearchBar />
      </div>
    </div>
  );
}

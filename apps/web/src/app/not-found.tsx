import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-muted-foreground">This page could not be found.</p>
      <Link
        href="/en"
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Go home
      </Link>
    </div>
  );
}

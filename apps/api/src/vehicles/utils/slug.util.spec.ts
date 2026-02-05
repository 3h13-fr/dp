import { normalizeForSlug, normalizedAlias } from './slug.util';

describe('slug.util', () => {
  describe('normalizeForSlug', () => {
    it('should return empty for empty or non-string', () => {
      expect(normalizeForSlug('')).toBe('');
      expect(normalizeForSlug('   ')).toBe('');
    });

    it('should lowercase and trim', () => {
      expect(normalizeForSlug('  Renault  ')).toBe('renault');
    });

    it('should replace spaces with single dash', () => {
      expect(normalizeForSlug('Renault Clio')).toBe('renault-clio');
    });

    it('should strip accents', () => {
      expect(normalizeForSlug('Citroën')).toBe('citroen');
      expect(normalizeForSlug('Café')).toBe('cafe');
    });

    it('should remove non-alphanumeric except dash', () => {
      expect(normalizeForSlug('VW (Volkswagen)')).toBe('vw-volkswagen');
    });

    it('should collapse multiple dashes', () => {
      expect(normalizeForSlug('a   b')).toBe('a-b');
      expect(normalizeForSlug('a--b')).toBe('a-b');
    });

    it('should trim leading/trailing dashes', () => {
      expect(normalizeForSlug('-renault-')).toBe('renault');
    });
  });

  describe('normalizedAlias', () => {
    it('should normalize for alias matching', () => {
      expect(normalizedAlias('  VW  ')).toBe('vw');
      expect(normalizedAlias('Volkswagen')).toBe('volkswagen');
      expect(normalizedAlias('Citroën')).toBe('citroen');
    });
  });
});

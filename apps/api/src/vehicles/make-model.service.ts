import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReferenceStatus } from 'database';
import { normalizeForSlug, normalizedAlias } from './utils/slug.util';
import { levenshteinDistance, DEFAULT_MAX_DEDUPE_DISTANCE } from './levenshtein.util';

export interface MakeSuggestion {
  id: string;
  name: string;
  slug: string;
  status: ReferenceStatus;
}

export interface SuggestMakeResult {
  suggestions: MakeSuggestion[];
  created?: MakeSuggestion;
}

export interface ModelSuggestion {
  id: string;
  name: string;
  slug: string;
  status: ReferenceStatus;
  makeId: string;
}

export interface SuggestModelResult {
  suggestions: ModelSuggestion[];
  created?: ModelSuggestion;
}

@Injectable()
export class MakeModelService {
  constructor(private prisma: PrismaService) {}

  async resolveMakeBySlug(slug: string) {
    const normalized = normalizeForSlug(slug);
    if (!normalized) return null;
    return this.prisma.make.findFirst({
      where: { slug: normalized },
    });
  }

  async findMakeById(id: string) {
    return this.prisma.make.findUnique({
      where: { id },
    });
  }

  async resolveModelByMakeAndSlug(makeId: string, modelSlug: string) {
    const normalized = normalizeForSlug(modelSlug);
    if (!normalized) return null;
    return this.prisma.model.findUnique({
      where: { makeId_slug: { makeId, slug: normalized } },
    });
  }

  async listModelsByMake(makeId: string) {
    return this.prisma.model.findMany({
      where: { makeId },
      orderBy: { name: 'asc' },
    });
  }

  async listMakes(q?: string) {
    if (q?.trim()) {
      const term = q.trim().toLowerCase();
      return this.prisma.make.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
      });
    }
    return this.prisma.make.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async suggestMakeByName(name: string): Promise<SuggestMakeResult> {
    const slug = normalizeForSlug(name);
    if (!slug) return { suggestions: [] };

    const existing = await this.prisma.make.findFirst({
      where: { slug },
    });
    if (existing) {
      return { suggestions: [this.toMakeSuggestion(existing)] };
    }

    const allMakes = await this.prisma.make.findMany({ include: { aliases: true } });
    const normAlias = normalizedAlias(name);
    const matches: Array<{ make: typeof allMakes[0]; distance: number }> = [];
    for (const make of allMakes) {
      const nameDist = levenshteinDistance(normalizedAlias(make.name), normAlias);
      if (nameDist <= DEFAULT_MAX_DEDUPE_DISTANCE) {
        matches.push({ make, distance: nameDist });
      }
      for (const a of make.aliases) {
        const aliasDist = levenshteinDistance(a.normalizedAlias, normAlias);
        if (aliasDist <= DEFAULT_MAX_DEDUPE_DISTANCE) {
          matches.push({ make, distance: aliasDist });
          break;
        }
      }
    }
    matches.sort((a, b) => a.distance - b.distance);
    const unique = Array.from(new Map(matches.map((m) => [m.make.id, m.make])).values());
    return {
      suggestions: unique.map((m) => this.toMakeSuggestion(m)),
    };
  }

  async suggestModelByName(makeId: string, name: string): Promise<SuggestModelResult> {
    const slug = normalizeForSlug(name);
    if (!slug) return { suggestions: [] };

    const existing = await this.prisma.model.findUnique({
      where: { makeId_slug: { makeId, slug } },
    });
    if (existing) {
      return { suggestions: [this.toModelSuggestion(existing)] };
    }

    const models = await this.prisma.model.findMany({
      where: { makeId },
      include: { aliases: true },
    });
    const normName = normalizedAlias(name);
    const matches: Array<{ model: typeof models[0]; distance: number }> = [];
    for (const model of models) {
      const d = levenshteinDistance(normalizedAlias(model.name), normName);
      if (d <= DEFAULT_MAX_DEDUPE_DISTANCE) matches.push({ model, distance: d });
      for (const a of model.aliases) {
        if (levenshteinDistance(a.normalizedAlias, normName) <= DEFAULT_MAX_DEDUPE_DISTANCE) {
          matches.push({ model, distance: 0 });
          break;
        }
      }
    }
    matches.sort((a, b) => a.distance - b.distance);
    const unique = Array.from(new Map(matches.map((m) => [m.model.id, m.model])).values());
    return {
      suggestions: unique.map((m) => this.toModelSuggestion(m)),
    };
  }

  async createMakeUnverified(name: string): Promise<MakeSuggestion> {
    const slug = normalizeForSlug(name) || 'unknown';
    const suggested = await this.suggestMakeByName(name);
    if (suggested.suggestions.length > 0) {
      return suggested.suggestions[0];
    }
    const created = await this.prisma.make.create({
      data: {
        name: name.trim(),
        slug,
        status: ReferenceStatus.unverified,
        externalSource: 'crowd',
        externalId: null,
      },
    });
    return this.toMakeSuggestion(created);
  }

  async createModelUnverified(makeId: string, name: string): Promise<ModelSuggestion> {
    const slug = normalizeForSlug(name) || 'unknown';
    const suggested = await this.suggestModelByName(makeId, name);
    if (suggested.suggestions.length > 0) {
      return suggested.suggestions[0];
    }
    const created = await this.prisma.model.create({
      data: {
        makeId,
        name: name.trim(),
        slug,
        status: ReferenceStatus.unverified,
        externalSource: 'crowd',
        externalId: null,
      },
    });
    return this.toModelSuggestion(created);
  }

  private toMakeSuggestion(m: { id: string; name: string; slug: string; status: ReferenceStatus }): MakeSuggestion {
    return { id: m.id, name: m.name, slug: m.slug, status: m.status };
  }

  private toModelSuggestion(m: { id: string; name: string; slug: string; status: ReferenceStatus; makeId: string }): ModelSuggestion {
    return { id: m.id, name: m.name, slug: m.slug, status: m.status, makeId: m.makeId };
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OcrResult {
  parsedText: string;
  raw?: unknown;
}

@Injectable()
export class OcrSpaceService {
  private readonly apiKey: string;
  private readonly endpoint = 'https://api.ocr.space/parse/image';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('OCR_SPACE_API_KEY', '');
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Send image URL to OCR.space and return parsed text.
   * Returns null if not configured, request fails, or OCR returns no text.
   */
  async parseImageUrl(imageUrl: string): Promise<OcrResult | null> {
    if (!this.isConfigured()) return null;
    try {
      const form = new URLSearchParams();
      form.append('url', imageUrl);
      form.append('language', 'eng');
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const data = (await res.json()) as {
        OCRExitCode?: number;
        IsErroredOnProcessing?: boolean;
        ParsedResults?: Array<{
          FileParseExitCode?: number;
          ParsedText?: string;
          ErrorMessage?: string;
        }>;
      };
      if (data.IsErroredOnProcessing || data.OCRExitCode !== 1) return null;
      const first = data.ParsedResults?.[0];
      if (!first || first.FileParseExitCode !== 1 || !first.ParsedText?.trim()) return null;
      return { parsedText: first.ParsedText.trim(), raw: data };
    } catch {
      return null;
    }
  }
}

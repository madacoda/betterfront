import { VisualDefect } from '../types/index.js';

export interface VlmTriageResult {
  isBug: boolean;
  confidence: number;
  description: string;
  suggestedCssFix: string;
}

export class VlmClient {
  private provider: 'gemini' | 'claude' | 'openai' | 'mock';
  private apiKey?: string;

  constructor(provider: 'gemini' | 'claude' | 'openai' | 'mock' = 'mock', apiKey?: string) {
    this.provider = provider;
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  /**
   * Triages candidate visual defects, filtering out intentional design patterns
   * (e.g. avatar stacks, notification badge tags) from genuine rendering bugs.
   */
  public async triageDefect(
    defect: VisualDefect,
    cropBase64?: string
  ): Promise<VlmTriageResult> {
    if (this.provider === 'gemini' && this.apiKey && cropBase64) {
      try {
        return await this.callGeminiVision(defect, cropBase64);
      } catch (err) {
        console.warn(`[VlmClient] Gemini API call failed, falling back to heuristic: ${(err as Error).message}`);
      }
    }

    // Heuristic Fallback Engine
    return this.heuristicTriage(defect);
  }

  private heuristicTriage(defect: VisualDefect): VlmTriageResult {
    const selA = defect.elementA.selector.toLowerCase();
    const selB = defect.elementB?.selector.toLowerCase() || '';

    // Check for common intentional design patterns
    const isAvatarStack = (selA.includes('avatar') || selA.includes('user-img')) &&
                          (selB.includes('avatar') || selB.includes('user-img'));

    const isBadgeOnButton = (selA.includes('badge') || selA.includes('counter') || selA.includes('tag')) &&
                            (selB.includes('btn') || selB.includes('button') || selB.includes('icon'));

    const isFloatingActionButton = selA.includes('fab') || selA.includes('floating-btn');

    if (isAvatarStack) {
      return {
        isBug: false,
        confidence: 0.92,
        description: 'Detected overlapping avatar group. Classified as an intentional UI design pattern.',
        suggestedCssFix: 'None required.'
      };
    }

    if (isBadgeOnButton) {
      return {
        isBug: false,
        confidence: 0.90,
        description: 'Detected notification badge positioned on top of interactive button/icon. Classified as intentional.',
        suggestedCssFix: 'None required.'
      };
    }

    if (isFloatingActionButton) {
      return {
        isBug: false,
        confidence: 0.88,
        description: 'Floating Action Button (FAB) overlaying background container. Classified as intentional layout pattern.',
        suggestedCssFix: 'None required.'
      };
    }

    // Confirmed true layout defect
    if (defect.type === 'TEXT_ON_TEXT_COLLISION') {
      return {
        isBug: true,
        confidence: 0.95,
        description: `Text collision between "${defect.elementA.text?.substring(0, 30)}" and "${defect.elementB?.text?.substring(0, 30)}". Characters intersect and degrade readability.`,
        suggestedCssFix: `Check parent containers for fixed heights. Add "margin-bottom", "min-height: fit-content;", or ensure flex-direction wraps properly.`
      };
    }

    if (defect.type === 'HORIZONTAL_BLEED') {
      return {
        isBug: true,
        confidence: 0.98,
        description: `Element <${defect.elementA.selector}> overflows the visible viewport by ${defect.overflowPx}px, causing unwanted horizontal page scrolling on mobile.`,
        suggestedCssFix: `Replace fixed pixel widths with max-width: 100%; or replace width: 100vw with width: 100%;.`
      };
    }

    if (defect.type === 'TEXT_CLIPPING') {
      return {
        isBug: true,
        confidence: 0.94,
        description: `Text content inside <${defect.elementA.selector}> is clipped vertically by container fixed height without text-overflow ellipsis.`,
        suggestedCssFix: `Remove fixed height or set overflow: visible; or add text-overflow: ellipsis; white-space: nowrap;.`
      };
    }

    return {
      isBug: true,
      confidence: 0.85,
      description: `Detected visual anomaly on <${defect.elementA.selector}>.`,
      suggestedCssFix: `Inspect computed CSS bounding box and padding.`
    };
  }

  private async callGeminiVision(defect: VisualDefect, base64Image: string): Promise<VlmTriageResult> {
    const prompt = `You are a Principal UI/UX Engineer auditing a frontend web application.
Evaluate this cropped screenshot containing a suspected visual layout bug.
Target element A: ${defect.elementA.selector}
Target element B: ${defect.elementB?.selector || 'None'}
Defect type: ${defect.type}

Respond strictly in valid JSON format:
{
  "isBug": boolean,
  "confidence": number,
  "description": string,
  "suggestedCssFix": string
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty Gemini response');

    return JSON.parse(rawText) as VlmTriageResult;
  }
}

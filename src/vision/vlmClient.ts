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
  private model?: string;

  constructor(
    provider: 'gemini' | 'claude' | 'openai' | 'mock' = 'mock',
    apiKey?: string,
    model?: string
  ) {
    this.provider = provider;
    this.model = model;
    if (apiKey) {
      this.apiKey = apiKey;
    } else if (provider === 'gemini') {
      this.apiKey = process.env.GEMINI_API_KEY;
    } else if (provider === 'claude') {
      this.apiKey = process.env.ANTHROPIC_API_KEY;
    } else if (provider === 'openai') {
      this.apiKey = process.env.OPENAI_API_KEY;
    }
  }

  /**
   * Triages candidate visual defects, filtering out intentional design patterns
   * (e.g. avatar stacks, notification badge tags, FABs) from genuine rendering bugs.
   */
  public async triageDefect(
    defect: VisualDefect,
    cropBase64?: string,
    enableAiVisionTriage = false
  ): Promise<VlmTriageResult> {
    // Preserve pre-populated specialized triage (e.g. from contrast or link inspectors) when mock/offline
    if ((!enableAiVisionTriage || this.provider === 'mock' || !this.apiKey) && defect.aiTriage) {
      return defect.aiTriage;
    }

    if (enableAiVisionTriage && this.apiKey && cropBase64) {
      try {
        if (this.provider === 'gemini') {
          return await this.callGeminiVision(defect, cropBase64);
        }
        if (this.provider === 'claude') {
          return await this.callClaudeVision(defect, cropBase64);
        }
        if (this.provider === 'openai') {
          return await this.callOpenAiVision(defect, cropBase64);
        }
      } catch (err) {
        console.warn(`[VlmClient] ${this.provider} API call failed, falling back to CSS/geometry heuristic: ${(err as Error).message}`);
      }
    }

    return this.heuristicTriage(defect);
  }

  private heuristicTriage(defect: VisualDefect): VlmTriageResult {
    const selA = defect.elementA.selector.toLowerCase();
    const selB = defect.elementB?.selector.toLowerCase() || '';
    const stylesA = defect.elementA.computedStyles || {};
    const stylesB = defect.elementB?.computedStyles || {};

    // 1. Check for intentional overlapping Avatar Stacks (via selector OR circular borderRadius + negative marginLeft)
    const isCircularA = stylesA.borderRadius === '50%' || parseFloat(stylesA.borderRadius || '0') >= 999;
    const isCircularB = stylesB.borderRadius === '50%' || parseFloat(stylesB.borderRadius || '0') >= 999;
    const hasNegMargin = parseFloat(stylesA.marginLeft || '0') < 0 || parseFloat(stylesB.marginLeft || '0') < 0;

    const isAvatarStack =
      ((selA.includes('avatar') || selA.includes('user-img')) &&
        (selB.includes('avatar') || selB.includes('user-img'))) ||
      (isCircularA && isCircularB && hasNegMargin);

    // 2. Check for Notification Badge / Counter Pill on top of Button/Icon
    const rectA = defect.elementA.rect;
    const rectB = defect.elementB?.rect;
    const isSmallPillA = rectA.width <= 36 && rectA.height <= 26 && (defect.elementA.text || '').length <= 4;
    const isBadgeOnButton =
      ((selA.includes('badge') || selA.includes('counter') || selA.includes('tag') || isSmallPillA) &&
        (selB.includes('btn') || selB.includes('button') || selB.includes('icon'))) ||
      ((selB.includes('badge') || selB.includes('counter')) &&
        (selA.includes('btn') || selA.includes('button') || selA.includes('icon')));

    // 3. Check for Floating Action Button (FAB)
    const isFloatingActionButton =
      selA.includes('fab') ||
      selA.includes('floating-btn') ||
      (stylesA.position === 'fixed' && isCircularA && rectA.width >= 44 && rectA.width <= 72);

    if (isAvatarStack) {
      return {
        isBug: false,
        confidence: 0.93,
        description: 'Detected overlapping circular avatar stack with negative margin offset. Classified as an intentional UI design pattern.',
        suggestedCssFix: 'None required.'
      };
    }

    if (isBadgeOnButton) {
      return {
        isBug: false,
        confidence: 0.91,
        description: 'Detected notification badge/counter positioned on corner of interactive button/icon. Classified as intentional.',
        suggestedCssFix: 'None required.'
      };
    }

    if (isFloatingActionButton && (!rectB || rectB.height > 100)) {
      return {
        isBug: false,
        confidence: 0.89,
        description: 'Floating Action Button (FAB) overlaying background container. Classified as intentional layout pattern.',
        suggestedCssFix: 'None required.'
      };
    }

    // Confirmed true layout defects with root-cause attribution
    if (defect.type === 'TEXT_ON_TEXT_COLLISION') {
      return {
        isBug: true,
        confidence: 0.95,
        description: `Text collision between "${defect.elementA.text?.substring(0, 30)}" and "${defect.elementB?.text?.substring(0, 30)}" (${defect.overlapBox?.area || 0}px² intersection). Characters cross-render and degrade readability.`,
        suggestedCssFix: `Avoid hardcoded absolute offsets or fixed parent heights. Add "margin-bottom", "min-height: fit-content;", or "flex-wrap: wrap; gap: 8px;".`
      };
    }

    if (defect.type === 'COMPONENT_OCCLUSION') {
      const occluder = defect.elementB?.selector || 'floating layer';
      const zIdx = defect.meta?.occludingZIndex ?? 'auto';
      return {
        isBug: true,
        confidence: 0.97,
        description: `Interactive control <${defect.elementA.selector}> is physically occluded by <${occluder}> (z-index: ${zIdx}), blocking pointer/touch events at ${defect.meta?.blockedPointsCount || 1}/5 hit points.`,
        suggestedCssFix: `Add "scroll-margin-top" or container top/bottom padding to clear sticky headers, or set "pointer-events: none;" on inactive overlays.`
      };
    }

    if (defect.type === 'HORIZONTAL_BLEED') {
      const sweepNote = defect.meta?.breakpointSweepWidth
        ? ` during responsive sweep at ${defect.meta.breakpointSweepWidth}px width`
        : '';
      return {
        isBug: true,
        confidence: 0.98,
        description: `Element <${defect.elementA.selector}> overflows the visible viewport by +${defect.overflowPx}px${sweepNote}, causing unwanted horizontal page scrolling.`,
        suggestedCssFix: `Replace fixed pixel widths with "max-width: 100%; width: 100%;", replace "width: 100vw" with "width: 100%", or apply "overflow-x: clip" on root container.`
      };
    }

    if (defect.type === 'TEXT_CLIPPING') {
      if (defect.meta?.isPrematureEllipsis) {
        return {
          isBug: true,
          confidence: 0.96,
          description: `Premature Ellipsis Trap on critical UI element <${defect.elementA.selector}> ("${defect.elementA.text}"). Content is amputated by +${defect.meta.clippedPx}px.`,
          suggestedCssFix: `Use intrinsic sizing ("width: fit-content; min-width: ...;") instead of fixed width with text-overflow: ellipsis on buttons, badges, and prices.`
        };
      }
      return {
        isBug: true,
        confidence: 0.94,
        description: `Text content inside <${defect.elementA.selector}> is clipped (${defect.meta?.direction || 'vertical'}) by +${defect.meta?.clippedPx || 0}px due to fixed container dimensions.`,
        suggestedCssFix: `Remove fixed height/width or use "min-height: fit-content;" so wrapped text is never amputated.`
      };
    }

    return {
      isBug: true,
      confidence: 0.88,
      description: `Detected ${defect.type.replace(/_/g, ' ')} anomaly on <${defect.elementA.selector}>.`,
      suggestedCssFix: `Inspect computed CSS bounding box, stacking context, and responsive constraints.`
    };
  }

  private buildPrompt(defect: VisualDefect): string {
    return `You are a Principal UI/UX Engineer auditing a frontend web application.
Evaluate this cropped screenshot containing a suspected visual layout bug.
Target element A: ${defect.elementA.selector} (text: "${defect.elementA.text || ''}")
Target element B: ${defect.elementB?.selector || 'None'} (text: "${defect.elementB?.text || ''}")
Defect type: ${defect.type}
Viewport: ${defect.viewportName} (${defect.viewportSize.width}x${defect.viewportSize.height})

Respond strictly in valid JSON format:
{
  "isBug": boolean,
  "confidence": number,
  "description": string,
  "suggestedCssFix": string
}`;
  }

  private async callGeminiVision(defect: VisualDefect, base64Image: string): Promise<VlmTriageResult> {
    const modelName = this.model || 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: this.buildPrompt(defect) },
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

  private async callClaudeVision(defect: VisualDefect, base64Image: string): Promise<VlmTriageResult> {
    const modelName = this.model || 'claude-3-5-sonnet-latest';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: this.buildPrompt(defect)
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text;
    if (!rawText) throw new Error('Empty Claude response');
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : rawText) as VlmTriageResult;
  }

  private async callOpenAiVision(defect: VisualDefect, base64Image: string): Promise<VlmTriageResult> {
    const modelName = this.model || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey!}`
      },
      body: JSON.stringify({
        model: modelName,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: this.buildPrompt(defect) },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('Empty OpenAI response');
    return JSON.parse(rawText) as VlmTriageResult;
  }
}

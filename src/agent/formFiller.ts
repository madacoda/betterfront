import { Page } from 'playwright';
import { faker } from '@faker-js/faker';
import { TypistEngine } from './typist.js';
import { FormFillerProfile } from '../types/index.js';

export interface FormFillOptions {
  profile?: FormFillerProfile;
  simulateTypingCadence?: boolean;
  boundaryStress?: boolean;
}

export class FormFillerEngine {
  private typist = new TypistEngine();

  /**
   * Autonomously detects and contextually fills out all visible forms on the page.
   */
  public async autoFillVisibleForms(
    page: Page,
    optionsOrProfile?: FormFillerProfile | FormFillOptions
  ): Promise<number> {
    const opts: FormFillOptions =
      typeof optionsOrProfile === 'string'
        ? { profile: optionsOrProfile, simulateTypingCadence: true, boundaryStress: false }
        : {
            profile: optionsOrProfile?.profile,
            simulateTypingCadence: optionsOrProfile?.simulateTypingCadence ?? true,
            boundaryStress: optionsOrProfile?.boundaryStress ?? false
          };

    const inputs = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll('input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])')
      );
      return elements
        .map((el) => {
          const input = el as HTMLInputElement;
          const rect = input.getBoundingClientRect();
          const labelEl = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : input.closest('label');
          return {
            id: input.id,
            name: input.name,
            type: input.type || 'text',
            placeholder: input.placeholder || '',
            ariaLabel: input.getAttribute('aria-label') || '',
            labelText: labelEl?.textContent?.trim() || '',
            value: input.value || '',
            isVisible: rect.width > 0 && rect.height > 0
          };
        })
        .filter((item) => item.isVisible && !item.value);
    });

    let filledCount = 0;

    for (const inp of inputs) {
      if (['submit', 'button', 'reset', 'checkbox', 'radio', 'file', 'color', 'range'].includes(inp.type)) {
        continue;
      }

      const selector = inp.id
        ? `#${inp.id}`
        : inp.name
          ? `[name="${inp.name}"]`
          : inp.placeholder
            ? `[placeholder="${inp.placeholder.replace(/"/g, '\\"')}"]`
            : undefined;
      if (!selector) continue;

      const semanticValue = this.generateSyntheticValue(
        inp.type,
        `${inp.name} ${inp.placeholder} ${inp.ariaLabel} ${inp.labelText}`,
        opts.profile,
        opts.boundaryStress
      );

      if (semanticValue) {
        try {
          if (opts.simulateTypingCadence !== false) {
            await this.typist.humanType(page, selector, semanticValue);
          } else {
            await page.locator(selector).first().fill(semanticValue, { timeout: 2500 });
          }
          filledCount++;
        } catch {
          // Ignore interaction failures
        }
      }
    }

    return filledCount;
  }

  private generateSyntheticValue(
    type: string,
    contextHint: string,
    profile?: FormFillerProfile,
    boundaryStress = false
  ): string | null {
    const text = (contextHint + ' ' + type).toLowerCase();

    if (type === 'email' || text.includes('email')) {
      return faker.internet.email();
    }
    if (type === 'password' || text.includes('password') || text.includes('pass')) {
      return faker.internet.password({ length: 14, prefix: 'Bf!9' });
    }
    if (type === 'tel' || text.includes('phone') || text.includes('mobile')) {
      return '+14155552671';
    }
    if (text.includes('card') || text.includes('cc-number')) {
      return '4242424242424242';
    }
    if (text.includes('cvv') || text.includes('cvc')) {
      return '424';
    }
    if (text.includes('exp')) {
      return '12/28';
    }
    if (profile === 'SEARCH' || text.includes('search') || type === 'search') {
      return boundaryStress
        ? 'WirelessHeadphones_🚀_UltraLongTokenWithoutSpacesToStressContainerFlexWrap'
        : faker.commerce.productName();
    }
    if (text.includes('first') || text.includes('fname')) {
      return faker.person.firstName();
    }
    if (text.includes('last') || text.includes('lname')) {
      return faker.person.lastName();
    }
    if (text.includes('name')) {
      return boundaryStress ? 'Alexandria Von Der Leyen-Hyphenated 🌟' : faker.person.fullName();
    }
    if (text.includes('address') || text.includes('street')) {
      return faker.location.streetAddress();
    }
    if (text.includes('city')) {
      return faker.location.city();
    }
    if (text.includes('zip') || text.includes('postal')) {
      return faker.location.zipCode('#####');
    }
    if (text.includes('company') || text.includes('org')) {
      return faker.company.name();
    }
    if (type === 'url' || text.includes('website')) {
      return 'https://example.com';
    }
    if (type === 'number') {
      return String(faker.number.int({ min: 1, max: 99 }));
    }
    if (boundaryStress) {
      return 'BoundaryTest_WWWWWWWWWWWWWWWWWWWWWWWW_مرحبا_🎉_<tag>';
    }
    if (profile === 'CONTACT_FORM' || text.includes('message') || text.includes('comment')) {
      return faker.lorem.sentence(8);
    }
    if (type === 'text' || type === 'textarea') {
      return faker.lorem.words(3);
    }

    return null;
  }
}

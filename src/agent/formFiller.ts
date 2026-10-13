import { Page } from 'playwright';
import { faker } from '@faker-js/faker';
import { TypistEngine } from './typist.js';

export class FormFillerEngine {
  private typist = new TypistEngine();

  /**
   * Autonomously detects and contextually fills out all visible forms on the page.
   */
  public async autoFillVisibleForms(page: Page): Promise<number> {
    const inputs = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])'));
      return elements.map((el) => {
        const input = el as HTMLInputElement;
        const rect = input.getBoundingClientRect();
        return {
          id: input.id,
          name: input.name,
          type: input.type || 'text',
          placeholder: input.placeholder || '',
          value: input.value || '',
          isVisible: rect.width > 0 && rect.height > 0
        };
      }).filter((item) => item.isVisible && !item.value);
    });

    let filledCount = 0;

    for (const inp of inputs) {
      const selector = inp.id ? `#${inp.id}` : (inp.name ? `input[name="${inp.name}"]` : undefined);
      if (!selector) continue;

      const semanticValue = this.generateSyntheticValue(inp.type, inp.name, inp.placeholder);
      if (semanticValue) {
        try {
          await this.typist.humanType(page, selector, semanticValue);
          filledCount++;
        } catch {
          // Ignore interaction failures
        }
      }
    }

    return filledCount;
  }

  private generateSyntheticValue(type: string, name: string, placeholder: string): string | null {
    const text = (name + ' ' + placeholder + ' ' + type).toLowerCase();

    if (type === 'email' || text.includes('email')) {
      return faker.internet.email();
    }
    if (type === 'password' || text.includes('password') || text.includes('pass')) {
      return faker.internet.password({ length: 12 });
    }
    if (type === 'tel' || text.includes('phone') || text.includes('mobile')) {
      return faker.phone.number();
    }
    if (text.includes('first') || text.includes('fname')) {
      return faker.person.firstName();
    }
    if (text.includes('last') || text.includes('lname')) {
      return faker.person.lastName();
    }
    if (text.includes('name')) {
      return faker.person.fullName();
    }
    if (text.includes('address') || text.includes('street')) {
      return faker.location.streetAddress();
    }
    if (text.includes('city')) {
      return faker.location.city();
    }
    if (text.includes('zip') || text.includes('postal')) {
      return faker.location.zipCode();
    }
    if (text.includes('company') || text.includes('org')) {
      return faker.company.name();
    }
    if (text.includes('search') || type === 'search') {
      return faker.commerce.productName();
    }
    if (type === 'number') {
      return String(faker.number.int({ min: 1, max: 100 }));
    }
    if (type === 'text') {
      return faker.lorem.words(3);
    }

    return null;
  }
}

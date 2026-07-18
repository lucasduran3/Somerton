import { pick } from './randomPicker.js';
import { templates } from './templates.js';

export function generateUniqueName(existingNames: string[]): string {
  for (let i = 0; i < 10; i++) {
    const template = pick(templates);
    const name = template();
    if (!existingNames.includes(name)) return name;
  }

  return `User${Date.now()}`;
}
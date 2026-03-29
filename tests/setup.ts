import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';

process.env.DEBUG_PRINT_LIMIT = process.env.DEBUG_PRINT_LIMIT ?? '2000';

configure({
  getElementError: (message) => {
    const safeMessage = message ?? '';
    const shortened = safeMessage.split('Here are the accessible roles:')[0].trim();
    return new Error(shortened);
  },
});



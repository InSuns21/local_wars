import '@testing-library/jest-dom';
import { configure } from '@testing-library/dom';

process.env.DEBUG_PRINT_LIMIT = process.env.DEBUG_PRINT_LIMIT ?? '2000';

configure({
  getElementError: (message) => {
    const shortened = message.split('Here are the accessible roles:')[0].trim();
    return new Error(shortened);
  },
});

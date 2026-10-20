import { preset } from '@lightspeed/unified-components-backoffice-theme/preset';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@lightspeed/unified-components-backoffice-theme/dist/**/*.js',
  ],
  presets: [preset],
}

import { defineConfig } from 'astro/config';

// Static site: `npm run build` writes plain HTML/CSS/JS to dist/, which any host can serve.
export default defineConfig({
  site: 'https://mfmedinburgh.org',
  trailingSlash: 'ignore',
});

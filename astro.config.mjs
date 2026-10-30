import { defineConfig } from 'astro/config';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Static site: `npm run build` writes plain HTML/CSS/JS to dist/, which any host can serve.
//
// BASE_PATH lets the same code run from a sub-folder, e.g. GitHub Pages at
// https://<user>.github.io/mfm-edinburgh-cms-1/ (BASE_PATH=/mfm-edinburgh-cms-1).
// Leave it unset when the site is served from the root of its own domain.
const base = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const site = process.env.SITE_URL || 'https://mfmedinburgh.org';

// After the build, prefix root-relative links ("/about/", "/images/x.jpg",
// url(/images/...)) with the base path, so content files can keep simple paths.
function basePathLinks() {
  return {
    name: 'base-path-links',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (!base) return;
        const root = fileURLToPath(dir);
        const skip = base.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const attr = new RegExp(`((?:href|src|srcset|poster|action|content)=["'])/(?!/|${skip}/)`, 'g');
        const css = new RegExp(`(url\\((?:&quot;|["'])?)/(?!/|${skip}/)`, 'g');
        const json = new RegExp(`("(?:src|image|url|href)":")/(?!/|${skip}/)`, 'g');
        const walk = async (d) => {
          for (const e of await readdir(d, { withFileTypes: true })) {
            const p = join(d, e.name);
            if (e.isDirectory()) await walk(p);
            else if (/\.(html|css)$/.test(e.name)) {
              const s = await readFile(p, 'utf8');
              const out = s.replace(attr, `$1${base}/`).replace(css, `$1${base}/`).replace(json, `$1${base}/`);
              if (out !== s) await writeFile(p, out);
            }
          }
        };
        await walk(root);
      },
    },
  };
}

export default defineConfig({
  site,
  base: base || undefined,
  trailingSlash: 'ignore',
  integrations: [basePathLinks()],
});

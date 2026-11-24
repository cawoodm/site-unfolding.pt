import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { CONTENT_DIR, LANGUAGES, REDIRECT_HTML, TEMPLATE, renderLanguage } from './scripts/build-content.mjs';

const root = resolve(import.meta.dirname, 'www');
const outDir = resolve(import.meta.dirname, 'dist');

// www/index.html is the one template. In dev it is rendered per request; in the
// build it is rendered once per language after Vite has hashed its assets.
const singlePageDev = {
  name: 'single-page-dev',
  apply: 'serve',

  // Dev: serve "/" as the redirect page and "/<lang>/" as the rendered template.
  // Registered directly, so it runs before Vite's own middleware.
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const [path, query] = req.url.split('?');
      const send = (status, type, body) => {
        res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` });
        res.end(body);
      };
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (path === '/') return send(200, 'text/html', REDIRECT_HTML);
      const match = path.match(/^\/(en|de)(\/.*)?$/);
      if (!match || !LANGUAGES.includes(match[1])) return next();
      const [, lang, rest] = match;
      if (rest === undefined) {
        res.writeHead(301, { Location: `/${lang}/${query ? `?${query}` : ''}` });
        return res.end();
      }
      if (rest === '/' || rest === '/index.html') {
        try {
          const html = await server.transformIndexHtml('/index.html', renderLanguage(readFileSync(TEMPLATE, 'utf8'), lang));
          return send(200, 'text/html', html);
        } catch (error) {
          server.config.logger.error(error.message);
          const escaped = error.message.replace(/&/g, '&amp;').replace(/</g, '&lt;');
          return send(500, 'text/html', `<pre>${escaped}</pre>`);
        }
      }
      // /en/css/site.css and the like: relative asset URLs resolve to www/.
      req.url = `${rest}${query ? `?${query}` : ''}`;
      next();
    });

    // Pages are rendered per request, so a change only needs a browser reload.
    server.watcher.add([CONTENT_DIR, TEMPLATE]);
    server.watcher.on('all', (event, file) => {
      const path = resolve(file);
      const fromContent = relative(CONTENT_DIR, path);
      if ((fromContent.startsWith('..') || isAbsolute(fromContent)) && path !== TEMPLATE) return;
      server.ws.send({ type: 'full-reload' });
    });
  },
};

// Build: dist/index.html is the built template with hashed assets (./assets/…).
// Render it per language into dist/<lang>/index.html, then turn dist/index.html
// into the language redirect. A throw here fails the build.
const singlePageBuild = {
  name: 'single-page-build',
  apply: 'build',
  closeBundle: {
    order: 'post',
    handler() {
      const built = readFileSync(join(outDir, 'index.html'), 'utf8');
      for (const lang of LANGUAGES) {
        const html = renderLanguage(built, lang).replaceAll('./assets/', '../assets/');
        mkdirSync(join(outDir, lang), { recursive: true });
        writeFileSync(join(outDir, lang, 'index.html'), html);
      }
      writeFileSync(join(outDir, 'index.html'), REDIRECT_HTML);
    },
  },
};

export default defineConfig({
  root,
  // Relative asset URLs, so the build works on a custom domain and under
  // cawoodm.github.io/site-unfolding.pt/.
  base: './',
  appType: 'mpa',
  server: { port: 8000 },
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: resolve(root, 'index.html') },
  },
  plugins: [tailwindcss(), singlePageDev, singlePageBuild],
});

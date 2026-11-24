import { existsSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { buildContent, CONTENT_DIR, TEMPLATE } from './scripts/build-content.mjs';

// Render content/ into www/<lang>/index.html before the page list is collected.
buildContent();

const root = resolve(import.meta.dirname, 'www');

// Every index.html under www/ (except public/) is a page of the multi-page build.
function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'public' ? [] : pages(path);
    return entry.name === 'index.html' ? [path] : [];
  });
}

// Pages link to folders (/en/legal-notice/). Redirect folder URLs without a
// trailing slash to the slash form, like GitHub Pages does.
const trailingSlash = {
  name: 'trailing-slash',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const [path, query] = req.url.split('?');
      if (!path.endsWith('/') && existsSync(resolve(root, `.${path}`, 'index.html'))) {
        res.writeHead(301, { Location: `${path}/${query ? `?${query}` : ''}` });
        return res.end();
      }
      next();
    });
  },
};

// Re-render the home pages in dev when content/ or the template changes.
const content = {
  name: 'content',
  configureServer(server) {
    server.watcher.add([CONTENT_DIR, TEMPLATE]);
    server.watcher.on('all', (event, file) => {
      const path = resolve(file);
      const fromContent = relative(CONTENT_DIR, path);
      if ((fromContent.startsWith('..') || isAbsolute(fromContent)) && path !== TEMPLATE) return;
      try {
        buildContent();
        server.ws.send({ type: 'full-reload' });
      } catch (error) {
        server.config.logger.error(error.message);
      }
    });
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
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: pages(root) },
  },
  plugins: [tailwindcss(), trailingSlash, content],
});

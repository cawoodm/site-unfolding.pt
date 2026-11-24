import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname, 'old');

// The pages link to folders without a trailing slash (/en, /de/impressum).
// Redirect those to /en/ so Vite serves the folder's index.html.
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

// Serve the static Sitejet export in old/ as the site root.
export default defineConfig({
  root,
  appType: 'mpa',
  server: { port: 8000 },
  plugins: [trailingSlash],
});

import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// This is a multi-page app: every screen is its own real .html file.
// In dev, Vite serves any .html file it finds. For the production build,
// though, Vite only bundles the pages you list as "inputs", so we list
// index.html plus everything in pages/ automatically. Adding a new page is
// then just "create pages/whatever.html" with no config change.
// import.meta.dirname = the folder this config file is in (the repo root).
const pageFiles = readdirSync(resolve(import.meta.dirname, 'pages')).filter((f) => f.endsWith('.html'));

const input: Record<string, string> = { home: resolve(import.meta.dirname, 'index.html') };
for (const file of pageFiles) {
  input[file.replace(/\.html$/, '')] = resolve(import.meta.dirname, 'pages', file);
}

export default defineConfig({
  build: {
    rollupOptions: { input },
  },
});

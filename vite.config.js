import { defineConfig } from 'vite';
import { readFileSync, readdirSync, rmSync, rmdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// Build profiles (the profile, never the host name, selects the platform adapter):
//   development / production (`npm run dev`, `npm run build` → dist)  local adapter, TEST MODE
//   qa          (`npm run build:qa` → dist-qa)                          local adapter + QA hooks
//   youtube     (`npm run build:youtube` → dist-youtube)               YouTube release
//   youtube-qa  (`npm run build:youtube-qa` → dist-youtube-qa)         YouTube adapter + QA hooks
const YT_SDK_URL = 'https://www.youtube.com/game_api/v1';

// YouTube profile: the SDK must load before any game code, and the game must not use the
// Page Visibility API (host pause comes from ytgame.system.onPause / onResume only).
function youtubeProfile() {
  return {
    name: 'youtube-playables-profile',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // First script of the document, right after the charset / viewport metas.
        const tag = `<script src="${YT_SDK_URL}"></script>`;
        const anchor = '<meta name="viewport"';
        const at = html.indexOf(anchor);
        if (at < 0) throw new Error('youtube profile: viewport meta not found in index.html');
        const end = html.indexOf('>', at) + 1;
        return `${html.slice(0, end)}\n    ${tag}${html.slice(end)}`;
      },
    },
    // Phaser 3.90 registers visibilitychange / window blur+focus handlers in Game.boot via
    // VisibilityHandler(this). The call is removed in this profile only; the check demands
    // exactly one match so a Phaser update that changes the structure stops the build.
    transform(code, id) {
      // Vite resolves `phaser` to dist/phaser.js (browser field); the ESM file is matched too.
      if (!/[\\/]phaser[\\/]dist[\\/]phaser(\.esm)?\.js$/.test(id.split('?')[0])) return null;
      const call = /^([ \t]*)VisibilityHandler\(this\);\r?$/gm;
      const matches = code.match(call) ?? [];
      if (matches.length !== 1) throw new Error(`youtube profile: expected 1 VisibilityHandler(this) call in Phaser, found ${matches.length}`);
      let out = code.replace(call, '$1/* VisibilityHandler removed for YouTube Playables (host lifecycle only) */');
      // The (now unused) handler body is emptied too, so no visibility listener code ships.
      const head = 'var VisibilityHandler = function (game)';
      const tail = 'module.exports = VisibilityHandler;';
      const start = out.indexOf(head);
      if (start < 0 || out.indexOf(head, start + 1) >= 0) throw new Error('youtube profile: VisibilityHandler definition not found exactly once');
      const end = out.indexOf(tail, start);
      if (end < 0) throw new Error('youtube profile: VisibilityHandler export not found');
      out = `${out.slice(0, start)}var VisibilityHandler = function () {};\n\n${out.slice(end)}`;
      return { code: out, map: null };
    },
    // Only files the game can request are hosted: public art/audio that no manifest, audio list
    // or index.html references (asset-pipeline leftovers) and empty folders are dropped.
    async closeBundle() {
      const { IMAGE_ASSETS } = await import('./src/content/assets.js');
      const { SOUND_FILES, MUSIC, AUDIO_PATH } = await import('./src/content/audio.js');
      const outDir = resolve(this.environment?.config?.build?.outDir ?? 'dist-youtube');
      const used = new Set([...IMAGE_ASSETS.map((a) => a.url), ...[...SOUND_FILES, MUSIC.file].map((k) => `${AUDIO_PATH}${k}.ogg`)]);
      const html = readFileSync(join(outDir, 'index.html'), 'utf8');
      const removed = [];
      const prune = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const path = join(dir, entry.name);
          if (entry.isDirectory()) {
            prune(path);
            if (!readdirSync(path).length) { rmdirSync(path); removed.push(`${relative(outDir, path)}/`); }
            continue;
          }
          const rel = relative(outDir, path).split(sep).join('/');
          if (!used.has(rel) && !html.includes(rel)) { rmSync(path); removed.push(rel); }
        }
      };
      for (const entry of readdirSync(join(outDir, 'assets'), { withFileTypes: true })) {
        if (entry.isDirectory()) prune(join(outDir, 'assets', entry.name)); // build outputs live in assets/ itself
      }
      for (const entry of readdirSync(join(outDir, 'assets'), { withFileTypes: true })) {
        const path = join(outDir, 'assets', entry.name);
        if (entry.isDirectory() && !readdirSync(path).length) { rmdirSync(path); removed.push(`assets/${entry.name}/`); }
      }
      if (removed.length) console.log(`youtube profile: removed ${removed.length} unreferenced public file(s): ${removed.join(', ')}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const youtube = mode === 'youtube' || mode === 'youtube-qa';
  const qaHooks = mode === 'qa' || mode === 'youtube-qa';
  const outDir = { qa: 'dist-qa', youtube: 'dist-youtube', 'youtube-qa': 'dist-youtube-qa' }[mode] ?? 'dist';
  return {
    base: './',
    define: {
      __PLATFORM__: JSON.stringify(youtube ? 'youtube' : 'dev'),
      __QA_HOOKS__: JSON.stringify(qaHooks),
    },
    plugins: youtube ? [youtubeProfile()] : [],
    // Keep Phaser out of the dev pre-bundle cache only when the YouTube transform must see it.
    optimizeDeps: youtube ? { exclude: ['phaser'] } : {},
    build: {
      outDir,
      target: 'es2022',
      sourcemap: false,
      assetsInlineLimit: 4096,
    },
  };
});

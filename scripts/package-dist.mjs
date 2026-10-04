import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const outDir = resolve(root, 'release');
const archive = resolve(outDir, 'livestream-mukbang-level1.zip');

if (!existsSync(dist)) throw new Error('dist is missing; run npm run build first');
mkdirSync(outDir, { recursive: true });

if (process.platform === 'win32') {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${dist}\\*' -DestinationPath '${archive}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', archive, '.'], { cwd: dist, stdio: 'inherit' });
}

console.log(archive);

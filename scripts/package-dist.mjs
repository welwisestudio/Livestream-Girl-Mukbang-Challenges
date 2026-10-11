import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const outDir = resolve(root, 'release');
const archive = resolve(outDir, 'livestream-girl-mukbang-challenges-latest.zip');

if (!existsSync(dist)) throw new Error('dist is missing; run npm run build first');
mkdirSync(outDir, { recursive: true });

if (process.platform === 'win32') {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${dist}\\*' -DestinationPath '${archive}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', archive, '.'], { cwd: dist, stdio: 'inherit' });
}

console.log(archive);

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const listFiles = (base, folder = base) => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
  const path = join(folder, entry.name);
  return entry.isDirectory() ? listFiles(base, path) : [relative(base, path).replaceAll('\\', '/')];
}).sort();

const verifyDir = mkdtempSync(join(tmpdir(), 'mukbang-zip-'));
try {
  execFileSync('tar', ['-xf', archive, '-C', verifyDir], { stdio: 'inherit' });
  const sourceFiles = listFiles(dist);
  const packedFiles = listFiles(verifyDir);
  if (!packedFiles.includes('index.html')) throw new Error('ZIP index.html is not at archive root');
  if (sourceFiles.join('\n') !== packedFiles.join('\n')) throw new Error('ZIP file list differs from dist');
  for (const file of sourceFiles) {
    if (!/^[a-z0-9_./-]+$/i.test(file)) throw new Error(`Non-portable ZIP path: ${file}`);
    if (hash(join(dist, file)) !== hash(join(verifyDir, file))) throw new Error(`ZIP checksum mismatch: ${file}`);
  }
  const unpackedBytes = sourceFiles.reduce((sum, file) => sum + statSync(join(dist, file)).size, 0);
  console.log(`files=${sourceFiles.length}`);
  console.log(`unpackedBytes=${unpackedBytes}`);
  console.log(`zipBytes=${statSync(archive).size}`);
  console.log(`zipSha256=${hash(archive)}`);
  console.log('verified=index-at-root,file-list,per-file-sha256,portable-paths');
} finally {
  const resolvedTemp = resolve(verifyDir);
  if (!resolvedTemp.startsWith(resolve(tmpdir()))) throw new Error(`Refusing to remove unexpected path: ${resolvedTemp}`);
  rmSync(resolvedTemp, { recursive: true, force: true });
}

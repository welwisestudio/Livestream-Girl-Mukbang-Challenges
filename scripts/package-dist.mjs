import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { crc32, deflateRawSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

// Usage: node scripts/package-dist.mjs [buildDir=dist] [archive=release/livestream-girl-mukbang-challenges-latest.zip]
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, process.argv[2] ?? 'dist');
const archive = resolve(root, process.argv[3] ?? 'release/livestream-girl-mukbang-challenges-latest.zip');
const outDir = resolve(archive, '..');

if (!existsSync(dist)) throw new Error(`${dist} is missing; build it first`);
mkdirSync(outDir, { recursive: true });
rmSync(archive, { force: true });

// A YouTube package must be the release profile: SDK tag present, no dev/test code inside.
if (/dist-youtube$/.test(dist)) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  if (!html.includes('<script src="https://www.youtube.com/game_api/v1"></script>')) throw new Error('YouTube SDK script tag missing from index.html');
  // The SDK must be the very first <script> of any kind (inline config scripts count too).
  if (html.match(/<script\b[^>]*>/i)?.[0] !== '<script src="https://www.youtube.com/game_api/v1">') throw new Error('YouTube SDK must be the first script in index.html');
  const scan = (folder) => readdirSync(folder, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? scan(join(folder, e.name)) : [join(folder, e.name)]));
  for (const file of scan(dist).filter((f) => /\.(js|html)$/.test(f))) {
    const code = readFileSync(file, 'utf8');
    // Phaser keeps a guarded feature probe (`!!localStorage.getItem`); actual storage calls are banned.
    for (const banned of ['TEST AD · DEV MOCK', 'livestream-mukbang-dev-save', '__GAME_DEBUG__', 'localStorage.setItem', 'localStorage.getItem(', 'sessionStorage', 'indexedDB', 'visibilitychange', 'document.hidden', 'visibilityState', 'webkitHidden', 'navigator.language']) {
      if (code.includes(banned)) throw new Error(`Release bundle contains "${banned}" (${relative(dist, file)})`);
    }
  }
  for (const junk of ['.map', '.DS_Store', 'Thumbs.db']) {
    if (scan(dist).some((f) => f.endsWith(junk))) throw new Error(`Release bundle contains ${junk} files`);
  }
}

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const listFiles = (base, folder = base) => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
  const path = join(folder, entry.name);
  return entry.isDirectory() ? listFiles(base, path) : [relative(base, path).replaceAll('\\', '/')];
}).sort();

// Portable ZIP writer: files only (no directory entries), "/" separators, deflate or store,
// fixed timestamp so the same build gives the same archive. (PowerShell Compress-Archive
// wrote "\" separators, which breaks hosts that unpack on Linux.)
function writeZip(source, target, files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const DOS_TIME = 0; // 00:00:00
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01
  for (const name of files) {
    const data = readFileSync(join(source, name));
    const deflated = deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = crc32(data);
    const nameBytes = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(useDeflate ? 8 : 0, 8); local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, nameBytes, body);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(useDeflate ? 8 : 0, 10); entry.writeUInt16LE(DOS_TIME, 12); entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(body.length, 20); entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28); entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);
    offset += local.length + nameBytes.length + body.length;
  }
  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  writeFileSync(target, Buffer.concat([...chunks, ...central, end]));
}

writeZip(dist, archive, listFiles(dist));
console.log(archive);

const verifyDir = mkdtempSync(join(tmpdir(), 'mukbang-zip-'));
try {
  // Windows' own bsdtar (GNU tar from Git Bash reads "C:" as a remote host).
  const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', archive, '-C', verifyDir], { stdio: 'inherit' });
  // ZIP entry names must use "/" (some Compress-Archive versions write "\").
  const zip = readFileSync(archive);
  for (let i = 0; i + 46 <= zip.length; i += 1) {
    if (zip.readUInt32LE(i) !== 0x02014b50) continue;
    const nameLength = zip.readUInt16LE(i + 28);
    const name = zip.toString('utf8', i + 46, i + 46 + nameLength);
    if (name.includes('\\')) throw new Error(`ZIP entry uses a backslash: ${name}`);
    i += 45 + nameLength;
  }
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

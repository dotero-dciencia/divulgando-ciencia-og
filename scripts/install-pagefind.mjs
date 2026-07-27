import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, chmodSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const binDir = join(projectRoot, 'node_modules', 'pagefind', 'bin');
const binaryName = process.platform === 'win32' ? 'pagefind_extended.exe' : 'pagefind_extended';
const binaryPath = join(binDir, binaryName);

if (existsSync(binaryPath)) {
  process.exit(0);
}

const VERSION = 'v0.12.0';
const REPO = 'Pagefind/pagefind';

function getTarget(platform, arch) {
  if (platform === 'linux') {
    if (arch === 'x64') return 'x86_64-unknown-linux-musl';
    if (arch === 'arm64') return 'aarch64-unknown-linux-musl';
  } else if (platform === 'darwin') {
    if (arch === 'x64') return 'x86_64-apple-darwin';
    if (arch === 'arm64') return 'aarch64-apple-darwin';
  } else if (platform === 'win32') {
    if (arch === 'x64') return 'x86_64-pc-windows-msvc';
  }
  return null;
}

const target = getTarget(process.platform, process.arch);
if (!target) {
  console.error(`Unsupported platform: ${process.platform}/${process.arch}`);
  process.exit(1);
}

const assetName = `pagefind_extended-${VERSION}-${target}.tar.gz`;
const downloadUrl = `https://github.com/${REPO}/releases/download/${VERSION}/${assetName}`;
const localChecksumPath = join(projectRoot, 'node_modules', 'pagefind', 'checksums', `${assetName}.sha256`);

if (!existsSync(localChecksumPath)) {
  console.error(`Checksum file not found: ${localChecksumPath}. Did you run "npm install"?`);
  process.exit(1);
}

const tmpFile = join(tmpdir(), assetName);

async function download(url, dest, redirects = 0) {
  if (redirects > 5) {
    throw new Error('Too many redirects');
  }
  const response = await fetch(url, { redirect: 'follow' });
  if (response.status !== 200) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await import('node:fs/promises').then(fs => fs.writeFile(dest, buffer));
}

console.log(`Downloading pagefind binary from ${downloadUrl}`);
await download(downloadUrl, tmpFile);

const expectedHash = readFileSync(localChecksumPath, 'utf8').split(' ')[0].trim();
const actualHash = createHash('sha256').update(readFileSync(tmpFile)).digest('hex');
if (expectedHash !== actualHash) {
  console.error(`Checksum mismatch: expected ${expectedHash}, got ${actualHash}`);
  rmSync(tmpFile, { force: true });
  process.exit(1);
}

mkdirSync(binDir, { recursive: true });
const tarResult = spawnSync('tar', ['xvf', tmpFile, '-C', binDir], { stdio: 'inherit' });
if (tarResult.status !== 0) {
  console.error('Failed to extract pagefind binary');
  rmSync(tmpFile, { force: true });
  process.exit(1);
}

if (process.platform !== 'win32') {
  chmodSync(binaryPath, 0o755);
}

rmSync(tmpFile, { force: true });
console.log(`Pagefind binary installed to ${binaryPath}`);

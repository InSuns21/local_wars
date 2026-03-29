const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

const repoRoot = process.cwd();
const vitestCommand = path.join(repoRoot, 'node_modules', '.bin', 'vitest');

const FALLBACK_FULL_RUN_FILES = new Set([
  'package.json',
  'package-lock.json',
  'vitest.config.ts',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.node.json',
  'tests/setup.ts',
  'tests/setup.node.ts',
]);

const SOURCE_FILE_PATTERN = /^(src|tests)\/.+\.(?:[cm]?[jt]sx?|json)$/;

const runGit = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const getChangedFiles = () => {
  const tracked = runGit(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'])
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = runGit(['ls-files', '--others', '--exclude-standard'])
    .split(/\r?\n/)
    .filter(Boolean);

  return Array.from(new Set([...tracked, ...untracked]))
    .map((file) => file.replace(/\\/g, '/'))
    .filter(Boolean);
};

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log('No changed files detected. Skipping changed test run.');
  process.exit(0);
}

const forwardedArgs = process.argv.slice(2);
const relatedFiles = changedFiles.filter((file) => SOURCE_FILE_PATTERN.test(file));
const needsFullRun = changedFiles.some((file) => FALLBACK_FULL_RUN_FILES.has(file));

if (!needsFullRun && relatedFiles.length === 0) {
  console.log('No source or test files changed. Skipping changed test run.');
  process.exit(0);
}

const vitestArgs = needsFullRun
  ? ['run', '--passWithNoTests', ...forwardedArgs]
  : ['related', ...relatedFiles, '--passWithNoTests', ...forwardedArgs];

console.log(
  needsFullRun
    ? `Running full Vitest suite because global test inputs changed: ${changedFiles.join(', ')}`
    : `Running related Vitest tests for: ${relatedFiles.join(', ')}`,
);

const result = process.platform === 'win32'
  ? spawnSync('powershell.exe', [
      '-Command',
      `npx vitest ${vitestArgs.map((arg) => `"${arg}"`).join(' ')}`,
    ], {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    })
  : spawnSync(vitestCommand, vitestArgs, {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: false,
    });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

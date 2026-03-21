#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Module = require('module');

const repoRoot = path.resolve(__dirname, '..');
const aliasMap = {
  '@/': path.join(repoRoot, 'src') + path.sep,
  '@core/': path.join(repoRoot, 'src', 'core') + path.sep,
  '@store/': path.join(repoRoot, 'src', 'store') + path.sep,
  '@components/': path.join(repoRoot, 'src', 'components') + path.sep,
  '@hooks/': path.join(repoRoot, 'src', 'hooks') + path.sep,
  '@data/': path.join(repoRoot, 'src', 'data') + path.sep,
  '@services/': path.join(repoRoot, 'src', 'services') + path.sep,
  '@utils/': path.join(repoRoot, 'src', 'utils') + path.sep,
  '@types/': path.join(repoRoot, 'src', 'types') + path.sep,
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  for (const [alias, targetDir] of Object.entries(aliasMap)) {
    if (request.startsWith(alias)) {
      request = path.join(targetDir, request.slice(alias.length));
      break;
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
});

const {
  buildSelfPlayImprovementProposal,
  compareSelfPlayReports,
  renderSelfPlayComparisonMarkdown,
  renderSelfPlayImprovementProposalMarkdown,
  renderSelfPlayMarkdown,
  runSelfPlaySeries,
} = require('../src/core/analysis/selfPlay.ts');
const {
  buildNightmareAutotunePlan,
  renderNightmareAutotuneMarkdown,
  serializeNightmareTuningConfig,
} = require('../src/core/analysis/selfPlayAutoTune.ts');

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
};

const parseBoolean = (value, fallback) => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const fileTimestamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');

const args = parseArgs(process.argv.slice(2));
const runConfig = {
  maps: (args.maps ? String(args.maps).split(',') : ['plains-clash']).map((item) => item.trim()).filter(Boolean),
  matchCount: args.matches ? Number(args.matches) : 20,
  maxTurns: args['max-turns'] ? Number(args['max-turns']) : 60,
  seed: args.seed ? Number(args.seed) : 1,
  fogOfWar: parseBoolean(args['fog-of-war'], false),
  swapSidesEveryMatch: parseBoolean(args['swap-sides'], true),
  participants: {
    left: {
      id: 'left',
      label: args['left-label'] ? String(args['left-label']) : 'left',
      difficulty: args['left-difficulty'] ? String(args['left-difficulty']) : 'hard',
      selectedAiProfile: args['left-profile'] ? String(args['left-profile']) : 'balanced',
    },
    right: {
      id: 'right',
      label: args['right-label'] ? String(args['right-label']) : 'right',
      difficulty: args['right-difficulty'] ? String(args['right-difficulty']) : 'hard',
      selectedAiProfile: args['right-profile'] ? String(args['right-profile']) : 'balanced',
    },
  },
};

const outputDir = path.resolve(repoRoot, args['output-dir'] ? String(args['output-dir']) : path.join('docs', 'generated', 'self-play'));
const prefix = args.prefix ? String(args.prefix) : `${fileTimestamp()}_${runConfig.participants.left.label}-vs-${runConfig.participants.right.label}`;
const tuningFilePath = path.resolve(repoRoot, 'src', 'core', 'engine', 'aiNightmareTuning.ts');
fs.mkdirSync(outputDir, { recursive: true });

const beforeReport = runSelfPlaySeries(runConfig);
const beforeProposal = buildSelfPlayImprovementProposal(beforeReport);
const autotunePlan = buildNightmareAutotunePlan(beforeReport, undefined, beforeProposal);
const autotuneMarkdown = renderNightmareAutotuneMarkdown(autotunePlan);

const beforeJsonPath = path.join(outputDir, `${prefix}.before.json`);
const beforeMdPath = path.join(outputDir, `${prefix}.before.md`);
const beforeProposalMdPath = path.join(outputDir, `${prefix}.before.proposal.md`);
const autotuneMdPath = path.join(outputDir, `${prefix}.autotune.md`);
fs.writeFileSync(beforeJsonPath, JSON.stringify(beforeReport, null, 2), 'utf8');
fs.writeFileSync(beforeMdPath, renderSelfPlayMarkdown(beforeReport), 'utf8');
fs.writeFileSync(beforeProposalMdPath, renderSelfPlayImprovementProposalMarkdown(beforeProposal), 'utf8');
fs.writeFileSync(autotuneMdPath, autotuneMarkdown, 'utf8');

const previousTuningFile = fs.readFileSync(tuningFilePath, 'utf8');
fs.writeFileSync(tuningFilePath, serializeNightmareTuningConfig(autotunePlan.nextConfig), 'utf8');

try {
  const afterReport = runSelfPlaySeries(runConfig);
  const comparison = compareSelfPlayReports(beforeReport, afterReport);
  const afterProposal = buildSelfPlayImprovementProposal(afterReport, comparison);

  const afterJsonPath = path.join(outputDir, `${prefix}.after.json`);
  const afterMdPath = path.join(outputDir, `${prefix}.after.md`);
  const afterProposalMdPath = path.join(outputDir, `${prefix}.after.proposal.md`);
  const comparisonJsonPath = path.join(outputDir, `${prefix}.compare.json`);
  const comparisonMdPath = path.join(outputDir, `${prefix}.compare.md`);

  fs.writeFileSync(afterJsonPath, JSON.stringify(afterReport, null, 2), 'utf8');
  fs.writeFileSync(afterMdPath, renderSelfPlayMarkdown(afterReport), 'utf8');
  fs.writeFileSync(afterProposalMdPath, renderSelfPlayImprovementProposalMarkdown(afterProposal), 'utf8');
  fs.writeFileSync(comparisonJsonPath, JSON.stringify(comparison, null, 2), 'utf8');
  fs.writeFileSync(comparisonMdPath, renderSelfPlayComparisonMarkdown(comparison), 'utf8');

  console.log(`Before JSON: ${path.relative(repoRoot, beforeJsonPath)}`);
  console.log(`Before Markdown: ${path.relative(repoRoot, beforeMdPath)}`);
  console.log(`Before Proposal Markdown: ${path.relative(repoRoot, beforeProposalMdPath)}`);
  console.log(`Autotune Markdown: ${path.relative(repoRoot, autotuneMdPath)}`);
  console.log(`After JSON: ${path.relative(repoRoot, afterJsonPath)}`);
  console.log(`After Markdown: ${path.relative(repoRoot, afterMdPath)}`);
  console.log(`After Proposal Markdown: ${path.relative(repoRoot, afterProposalMdPath)}`);
  console.log(`Compare JSON: ${path.relative(repoRoot, comparisonJsonPath)}`);
  console.log(`Compare Markdown: ${path.relative(repoRoot, comparisonMdPath)}`);
} catch (error) {
  fs.writeFileSync(tuningFilePath, previousTuningFile, 'utf8');
  throw error;
}

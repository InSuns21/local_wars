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
const formatPercent = (value) => `${Math.round(value * 1000) / 10}%`;
const printStallSummary = (report) => {
  console.log('Summary:');
  console.log(`- avg turns: ${report.aggregate.averageTurns}`);
  console.log(`- turn limit rate: ${formatPercent(report.aggregate.turnLimitRate)}`);
  for (const participantId of ['left', 'right']) {
    const participant = report.aggregate.participants[participantId];
    console.log(`- ${participant.label}: stall=${formatPercent(participant.stallMatchRate)}, inactive=${formatPercent(participant.averageInactiveTurnRate)}, longest=${participant.averageLongestInactiveStreak}`);
    if (participant.suspectedStallReasons.length > 0) {
      console.log(`  reasons: ${participant.suspectedStallReasons.join(' | ')}`);
    }
  }
};

const args = parseArgs(process.argv.slice(2));
const report = runSelfPlaySeries({
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
});

const outputDir = path.resolve(repoRoot, args['output-dir'] ? String(args['output-dir']) : path.join('docs', 'generated', 'self-play'));
const prefix = args.prefix ? String(args.prefix) : `${fileTimestamp()}_${report.config.participants.left.label}-vs-${report.config.participants.right.label}`;
fs.mkdirSync(outputDir, { recursive: true });

const reportJsonPath = path.join(outputDir, `${prefix}.json`);
const reportMdPath = path.join(outputDir, `${prefix}.md`);
fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(reportMdPath, renderSelfPlayMarkdown(report), 'utf8');

printStallSummary(report);
console.log(`JSON: ${path.relative(repoRoot, reportJsonPath)}`);
console.log(`Markdown: ${path.relative(repoRoot, reportMdPath)}`);

let comparison;
if (args.baseline) {
  const before = JSON.parse(fs.readFileSync(path.resolve(repoRoot, String(args.baseline)), 'utf8'));
  comparison = compareSelfPlayReports(before, report);
  const comparisonJsonPath = path.join(outputDir, `${prefix}.compare.json`);
  const comparisonMdPath = path.join(outputDir, `${prefix}.compare.md`);
  fs.writeFileSync(comparisonJsonPath, JSON.stringify(comparison, null, 2), 'utf8');
  fs.writeFileSync(comparisonMdPath, renderSelfPlayComparisonMarkdown(comparison), 'utf8');
  console.log(`Compare JSON: ${path.relative(repoRoot, comparisonJsonPath)}`);
  console.log(`Compare Markdown: ${path.relative(repoRoot, comparisonMdPath)}`);
}

const proposal = buildSelfPlayImprovementProposal(report, comparison);
const proposalJsonPath = path.join(outputDir, `${prefix}.proposal.json`);
const proposalMdPath = path.join(outputDir, `${prefix}.proposal.md`);
fs.writeFileSync(proposalJsonPath, JSON.stringify(proposal, null, 2), 'utf8');
fs.writeFileSync(proposalMdPath, renderSelfPlayImprovementProposalMarkdown(proposal), 'utf8');
console.log(`Proposal JSON: ${path.relative(repoRoot, proposalJsonPath)}`);
console.log(`Proposal Markdown: ${path.relative(repoRoot, proposalMdPath)}`);

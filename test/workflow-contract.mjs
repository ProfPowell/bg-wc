// Workflow contract (gl-wc-mnyv): the Pages deployment must build the exact
// revision CI approved, hold write permissions only in the deploy job, and
// verify what went live. Asserted against the YAML text (no YAML dependency);
// the checks are deliberately shape-level so a reformat does not break them
// but removing a guarantee does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../.github/workflows/${f}`, import.meta.url), 'utf8');
const deploy = read('deploy-pages.yml');
const ci = read('ci.yml');

// Split a workflow into `jobs:` sections keyed by job id (top-level text first).
function jobs(yaml) {
  const idx = yaml.indexOf('\njobs:');
  assert.ok(idx > 0, 'workflow has a jobs: block');
  const top = yaml.slice(0, idx);
  const body = yaml.slice(idx + '\njobs:'.length);
  const out = { __top: top };
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^ {2}([\w-]+):\s*$/);
    if (m) {
      cur = m[1];
      out[cur] = '';
    } else if (cur) out[cur] += line + '\n';
  }
  return out;
}

const dj = jobs(deploy);

test('deploy-pages: build checks out the triggering CI head SHA, not the branch tip', () => {
  assert.ok(dj.build, 'build job exists');
  assert.match(
    dj.build,
    /ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\|\|\s*github\.sha\s*\}\}/,
    'checkout ref must be workflow_run.head_sha (falling back to github.sha for workflow_dispatch)'
  );
});

test('deploy-pages: only a successful CI run on main may deploy', () => {
  assert.match(deploy, /workflow_run:[\s\S]*?branches:\s*\[main\]/);
  assert.match(dj.build, /workflow_run\.conclusion == 'success'/);
  assert.match(dj.build, /workflow_run\.head_branch == 'main'/);
});

test('deploy-pages: checkout never persists the GITHUB_TOKEN', () => {
  assert.match(dj.build, /persist-credentials:\s*false/);
});

test('deploy-pages: Pages and OIDC writes live only in the deploy job', () => {
  assert.doesNotMatch(dj.__top, /pages:\s*write/, 'no workflow-level pages: write');
  assert.doesNotMatch(dj.__top, /id-token:\s*write/, 'no workflow-level id-token: write');
  assert.match(dj.build, /permissions:\s*\n\s+contents:\s*read/, 'build declares contents: read');
  assert.doesNotMatch(dj.build, /pages:\s*write|id-token:\s*write/, 'build has no write grants');
  assert.match(dj.deploy, /pages:\s*write/);
  assert.match(dj.deploy, /id-token:\s*write/);
});

test('deploy-pages: the built SHA is stamped into the site and verified after deploy', () => {
  assert.match(dj.build, /dist-site\/version\.json/, 'build writes dist-site/version.json');
  assert.match(dj.deploy, /version\.json/, 'deploy fetches version.json from the live site');
  assert.match(
    dj.deploy,
    /workflow_run\.head_sha\s*\|\|\s*github\.sha/,
    'deploy compares against the triggering SHA'
  );
});

test('ci: checkouts never persist the GITHUB_TOKEN', () => {
  const checkouts = ci.match(/uses:\s*actions\/checkout@/g) || [];
  const persisted = ci.match(/persist-credentials:\s*false/g) || [];
  assert.ok(checkouts.length > 0, 'ci has checkouts');
  assert.equal(
    persisted.length,
    checkouts.length,
    'every checkout sets persist-credentials: false'
  );
});

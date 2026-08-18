#!/usr/bin/env node
/**
 * Lamplighter — build check.
 *
 *   node tools/build-check.mjs
 *
 * Runs `tsc --noEmit` then `vite build`, streaming both. Prints a clear
 * PASS/FAIL banner and exits nonzero if either step fails. Used by CI and the
 * critic loop as the single "is the project healthy?" gate.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/**
 * Resolve a package's bin ENTRY SCRIPT (real JS), never its shim.
 *
 * Node >= 20.12 refuses to spawn `.cmd`/`.bat` shims with `shell:false`
 * (CVE-2024-27980), so `spawn('npx.cmd', …)` dies with EINVAL on Windows —
 * and `node_modules/.bin/tsc.cmd` is exactly the same kind of shim. The fix
 * mirrors gen-assets.mjs's resolveCodexCommand: find the real executable
 * rather than the wrapper. Here the "real executable" is the JS file named in
 * the dependency's own `bin` field, which we then run with the Node binary
 * already executing this script — no shell, no shim, no PATH lookup, and the
 * exact same Node that CI is using.
 *
 * Walks up from ROOT so hoisted / workspace installs resolve too.
 * `require.resolve` is deliberately NOT used: modern packages (vite) gate
 * `./bin/*` behind package.json `exports` and refuse subpath resolution.
 */
function resolveBinScript(pkg, binName) {
  let dir = ROOT;
  for (;;) {
    const pkgDir = path.join(dir, 'node_modules', pkg);
    const pkgJson = path.join(pkgDir, 'package.json');
    if (existsSync(pkgJson)) {
      try {
        const json = JSON.parse(readFileSync(pkgJson, 'utf8'));
        const bin = json.bin;
        const rel = typeof bin === 'string' ? bin : bin?.[binName];
        if (rel) {
          const abs = path.join(pkgDir, rel);
          if (existsSync(abs)) return abs;
        }
      } catch {
        /* malformed package.json — fall through to the parent scope */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** npm's own npx entry script, shipped beside the running Node binary. */
function resolveNpxScript() {
  const nodeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}

/**
 * Build the argv for a dev dependency's CLI, preferring the locally installed
 * entry script and falling back to npm's npx entry script. Both are plain JS
 * run through `process.execPath`, so neither path can trip the shim guard.
 */
function resolveRunner(pkg, binName, args) {
  const local = resolveBinScript(pkg, binName);
  if (local) return { file: process.execPath, argv: [local, ...args], how: `node ${path.relative(ROOT, local)}` };

  const npxScript = resolveNpxScript();
  if (npxScript) {
    console.log(C.yellow(`  ${pkg} not installed locally — falling back to npx`));
    return { file: process.execPath, argv: [npxScript, '--no-install', binName, ...args], how: `npx ${binName}` };
  }
  return null;
}

function run(label, pkg, binName, args) {
  return new Promise((resolve) => {
    console.log(C.cyan(`\n▶ ${label}`));
    const runner = resolveRunner(pkg, binName, args);
    if (!runner) {
      console.error(C.red(`  could not resolve "${binName}" — is ${pkg} installed? (npm i)`));
      resolve(false);
      return;
    }
    console.log(C.dim(`  ${runner.how} ${args.join(' ')}`));
    const started = Date.now();
    let child;
    try {
      child = spawn(runner.file, runner.argv, { cwd: ROOT, stdio: 'inherit', shell: false });
    } catch (err) {
      console.error(C.red(`  could not launch: ${err?.message || err}`));
      resolve(false);
      return;
    }
    child.on('error', (err) => {
      console.error(C.red(`  failed to start: ${err?.message || err}`));
      resolve(false);
    });
    child.on('close', (code) => {
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      if (code === 0) {
        console.log(C.green(`  ✓ ${label} passed ${C.dim(`(${secs}s)`)}`));
        resolve(true);
      } else {
        console.log(C.red(`  ✗ ${label} failed (exit ${code}, ${secs}s)`));
        resolve(false);
      }
    });
  });
}

function banner(ok) {
  const line = '═'.repeat(48);
  if (ok) {
    console.log(C.green(`\n${line}`));
    console.log(C.green(C.bold('   BUILD CHECK: PASS')));
    console.log(C.green(line));
  } else {
    console.log(C.red(`\n${line}`));
    console.log(C.red(C.bold('   BUILD CHECK: FAIL')));
    console.log(C.red(line));
  }
}

async function main() {
  console.log(C.bold('Lamplighter — build check'));

  const tsOk = await run('typecheck (tsc --noEmit)', 'typescript', 'tsc', ['--noEmit']);
  // Always attempt the build too, so a single run surfaces every problem.
  const viteOk = await run('bundle (vite build)', 'vite', 'vite', ['build']);

  const ok = tsOk && viteOk;
  banner(ok);
  if (!ok) {
    if (!tsOk) console.log(C.red('  • TypeScript type errors — fix and re-run.'));
    if (!viteOk) console.log(C.red('  • Vite build failed — see output above.'));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(C.red(err?.stack || String(err)));
  process.exit(1);
});

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
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(label, args) {
  return new Promise((resolve) => {
    console.log(C.cyan(`\n▶ ${label}`));
    console.log(C.dim(`  ${npx} ${args.join(' ')}`));
    const started = Date.now();
    let child;
    try {
      child = spawn(npx, args, { cwd: ROOT, stdio: 'inherit', shell: false });
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

  const tsOk = await run('typecheck (tsc --noEmit)', ['tsc', '--noEmit']);
  // Always attempt the build too, so a single run surfaces every problem.
  const viteOk = await run('bundle (vite build)', ['vite', 'build']);

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

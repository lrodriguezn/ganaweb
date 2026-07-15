#!/bin/sh
# Wrapper for `tsx` that registers the `skip-css` ESM resolver BEFORE
# tsx's own resolver is registered. Used by `apps/web/package.json` for
# the `test` and `test:unit` scripts so they can run without choking on
# `react-day-picker/style.css` (imported as a side-effect from
# `packages/ui/src/primitives/date-picker.tsx`).
#
# Strategy: write a small Node bootstrap that uses `module.register()`
# to load our skip-css resolver, then dynamically imports the tsx CLI.
# `module.register()` (Node 20+) registers an ESM resolver that runs
# BEFORE user code resolution, so the CSS short-circuit wins.

set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
exec node --input-type=module -e "
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
register(new URL('./.skip-css.mjs', 'file://$HERE/').href, new URL('file://$HERE/'));
const { spawn } = await import('node:child_process');
const tsxCli = path.resolve('$HERE', '../../node_modules/.pnpm/tsx@4.23.0/node_modules/tsx/dist/cli.mjs');
const child = spawn(process.execPath, [tsxCli, ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
"

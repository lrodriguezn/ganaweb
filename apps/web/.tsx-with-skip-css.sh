#!/bin/sh
# Wrapper for `tsx` that makes the runtime ignore `*.css` imports. Used by
# `apps/web/package.json` for the `test` and `test:unit` scripts so they can
# run without choking on `react-day-picker/style.css` (imported as a
# side-effect from `packages/ui/src/primitives/date-picker.tsx`).
#
# Mechanism: NODE_OPTIONS="--import ./.skip-css-register.mjs" registers the
# skip-css ESM hooks (see `.skip-css.mjs`) in every node process involved.
#
# Two earlier bugs made this wrapper a silent no-op:
# 1. tsx re-execs a CHILD node process; hooks registered in the wrapper
#    process (module.register + spawn) never reached the child. NODE_OPTIONS
#    propagates, so the hooks do.
# 2. `process.argv.slice(2)` under `node -e` dropped the test-file argument,
#    so tsx ran with no entry and exited 0 without executing any test.
#
# The wrapper now forwards "$@" verbatim and resolves `tsx` through the
# workspace `.bin` symlink (no hard-coded tsx version path).

set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE_OPTIONS="--import $HERE/.skip-css-register.mjs ${NODE_OPTIONS:-}"
export NODE_OPTIONS
exec "$HERE/node_modules/.bin/tsx" "$@"

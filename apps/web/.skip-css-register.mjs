/**
 * Bootstrap for `node --import`: registers the skip-css ESM hooks from
 * `.skip-css.mjs` in the CURRENT process. Kept as a standalone module so the
 * wrapper can pass it through NODE_OPTIONS — tsx re-execs a child node
 * process, and hooks registered in the parent (module.register before
 * spawn) never reach the child. NODE_OPTIONS propagates.
 */
import { register } from "node:module"

register(new URL("./.skip-css.mjs", import.meta.url))

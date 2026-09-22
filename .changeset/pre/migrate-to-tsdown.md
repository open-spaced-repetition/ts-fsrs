---
"ts-fsrs": patch
---

Migrate build toolchain from Rollup + esbuild to tsdown (powered by Rolldown). Remove sourcemap generation and code minification. Remove unnecessary dependencies (rollup, @rollup/plugin-*, rollup-plugin-esbuild, rollup-plugin-dts, tslib).

import path, { dirname } from "path";
import { fileURLToPath } from "url";
import commonjs from "@rollup/plugin-commonjs";
import { babel } from "@rollup/plugin-babel";
import alias from "@rollup/plugin-alias";
import ts from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";

const resolve = (p) => {
  return path.resolve(dirname(fileURLToPath(import.meta.url)), p);
};
const builds = {
  "ts-fsrs.cjs": {
    entry: resolve("src/fsrs/index.ts"),
    dest: (name) => `dist/${name}.js`,
    format: "cjs",
    env: "production",
    external: ["seedrandom", "dotenv"],
  },
  "ts-fsrs": {
    entry: resolve("src/fsrs/index.ts"),
    dest: (name) => `dist/${name}.js`,
    format: "esm",
    env: "production",
    external: ["seedrandom", "dotenv"],
  // "ts-fsrs.umd": {
  //   entry: resolve("src/fsrs/index.ts"),
  //   dest: (name) => `dist/${name}.js`,
  //   format: "umd",
  //   env: "production",
  //   globals: {
  //     seedrandom: "seedrandom",
  //     dotenv:"dotenv",
  //   },
  //   external: ["seedrandom", "dotenv"],
  // },
  }
};
const getConfig = (name) => {
  const opts = builds[name];
  const config = {
    input: opts.entry,
    external: opts.external,
    plugins: [
      commonjs(),
      babel({ babelHelpers: "bundled" }),
      alias({
        entries: {
          src: resolve("src"),
        },
      }),
      terser(),
      ts({
        tsconfig: resolve("./tsconfig.json"),
      }),
    ].concat(opts.plugins, []),
    output: {
      file: opts.dest(name),
      format: opts.format,
      name: opts.name || "ts-fsrs",
      sourcemap: true,
    },
  };
  if (opts.globals) {
    config.output.globals = opts.globals;
  }
  return config;
};

export default Object.keys(builds).map(getConfig);

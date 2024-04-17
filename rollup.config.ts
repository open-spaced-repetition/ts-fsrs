import {defineConfig} from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';


export default defineConfig([
    {
        input: {
            index: 'src/fsrs/index.ts',
        },
        output: [
            {
                dir: 'dist',
                entryFileNames: '[name].cjs',
                format: 'cjs',
                sourcemap: true,
                exports: 'named',
                footer: ({exports}) =>
                    exports.length > 0
                        ? 'module.exports = Object.assign(exports.default || {}, exports)'
                        : '',
            },
            {
                dir: 'dist',
                entryFileNames: '[name].mjs',
                format: 'esm',
                sourcemap: true,
            },
        ],
        plugins: [
            // 对于 fs、path 等内置模块不再搜索 node_modules
            resolve({preferBuiltins: true}),
            // 设置目标为 node >= 16.0
            esbuild({
                target: 'node16.0',
                sourceMap: true,
                minify: true,
            }),
            commonjs(),
        ],
        external: ["seedrandom"],
    }, 
    {
        input: 'src/fsrs/index.ts',
        output: {
            file: 'dist/index.umd.js', 
            format: 'umd',
            name: 'FSRS',
            sourcemap: true,
            globals: {
                seedrandom: 'seedrandom',
            },
        },
        plugins: [
            resolve(), 
            esbuild({ 
                target: 'es2017',
                minify: true,
                sourceMap: true,
            }),
            commonjs(),
        ],
        external: ["seedrandom"],
    },
    {
        input: 'src/fsrs/index.ts',
        output: {
            file: 'dist/index.d.ts',
            format: 'esm'
        },
        plugins: [
            dts({
                // https://github.com/Swatinem/rollup-plugin-dts/issues/143
                compilerOptions: {preserveSymlinks: false},
                respectExternal: true,
            }),
        ],
        external: ["seedrandom"],
    },
]);

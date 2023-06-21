import { build } from "esbuild"
import { polyfillNode } from "esbuild-plugin-polyfill-node"

build({
    bundle: true,
    entryPoints: ["src/index.ts"],
    format: "esm",
    inject: ["./buffer.js"],
    platform: "browser",
    plugins: [
        polyfillNode({
            globals: {
                buffer: false,
                process: false,
            },
            polyfills: {
                assert: true,
            },
        }),
    ],
    minify: true,
    outdir: "dist",
    sourcemap: true,
    splitting: true,
    target: "esnext",
})

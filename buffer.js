export const global = globalThis

export const Buffer =
    typeof globalThis.Buffer === "function" && typeof globalThis.Buffer.allocUnsafe === "function"
        ? globalThis.Buffer
        : require("buffer/").Buffer

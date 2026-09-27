// Preload stub for `server-only` so tsx can run server modules outside Next.js.
// Mirrors src/test/server-only-stub.ts used by vitest.
const Module = require("node:module");
const path = require("node:path");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === "server-only") {
    return path.resolve(__dirname, "../src/test/server-only-stub.ts");
  }
  return origResolve.call(this, request, ...args);
};

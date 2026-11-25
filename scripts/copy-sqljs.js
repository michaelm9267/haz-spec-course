// Copies the sql.js browser runtime into public/vendor/sql.js so it is served as a
// static file (and included in the build) instead of going through webpack, which
// can't bundle sql.js's Node-only imports (fs, path, crypto).
// Runs automatically before `npm start` and `npm run build`.
const fs = require("fs");
const path = require("path");

const src = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"));
const dest = path.join(__dirname, "..", "public", "vendor", "sql.js");
fs.mkdirSync(dest, { recursive: true });
for (const file of ["sql-wasm.js", "sql-wasm.wasm"]) fs.copyFileSync(path.join(src, file), path.join(dest, file));
console.log(`sql.js ${require("sql.js/package.json").version} copied to public/vendor/sql.js`);

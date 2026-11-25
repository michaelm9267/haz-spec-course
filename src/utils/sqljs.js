// Browser initialisation of sql.js (SQLite compiled to WebAssembly).
//
// sql.js can't be bundled by Create React App's webpack 5 (it references Node's
// fs/path/crypto), so scripts/copy-sqljs.js copies its browser runtime to
// public/vendor/sql.js before start/build, and it is loaded here with a script
// tag the first time a DoDAAC lookup runs.
import { assetUrl } from "./hazard";

const VENDOR = "vendor/sql.js";
let ready;

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Couldn't load the SQLite runtime."));
    document.head.appendChild(s);
  });

export default function initSqlJs() {
  if (!ready) {
    ready = (window.initSqlJs ? Promise.resolve() : loadScript(assetUrl(`${VENDOR}/sql-wasm.js`)))
      .then(() => window.initSqlJs({ locateFile: (file) => assetUrl(`${VENDOR}/${file}`) }))
      .catch((e) => {
        ready = undefined;
        throw e;
      });
  }
  return ready;
}

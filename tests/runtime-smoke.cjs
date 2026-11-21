const { loadPyodide } = require("../public/runtime/pyodide.js");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const root = path.resolve(__dirname, "../public");
  const py = await loadPyodide({ indexURL: path.join(root, "runtime") + path.sep });
  py.runPython(fs.readFileSync(path.join(root, "engine.py"), "utf8"));
  const problems = JSON.parse(fs.readFileSync(path.join(root, "problems.json"), "utf8"));
  for (const problem of problems) {
    const input = { code: problem.starter, problem, mode: "round", seed: 42 };
    py.globals.set("practice_request", JSON.stringify(input));
    const start = performance.now();
    const result = JSON.parse(py.runPython("json.dumps(practice(json.loads(practice_request)))"));
    assert(result.tests.every(test => test.passed));
    assert.equal(result.probes.length, 5);
    console.log(problem.id, result.probes.length, "probes", Math.round(performance.now() - start), "ms");
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

// This disposable classic worker owns the interpreter. The page enforces a separate deadline.
async function boot() {
  importScripts("./runtime/pyodide.js");
  const base = new URL("./runtime/", self.location.href).href;
  const py = await loadPyodide({indexURL: base, stdout: () => {}, stderr: () => {}});
  const response = await fetch(new URL("./engine.py", self.location.href));
  if (!response.ok) throw new Error("The practice engine could not load.");
  py.runPython(await response.text());
  self.onmessage = ({ data }) => {
    try {
      py.globals.set("practice_request", JSON.stringify(data));
      const json = py.runPython(`
try:
    practice_result = {"result": practice(json.loads(practice_request))}
except (PracticeError, SyntaxError, RecursionError) as issue:
    practice_result = {"error": str(issue)}
json.dumps(practice_result, allow_nan=False)
      `);
      self.postMessage(JSON.parse(json));
    } catch {
      self.postMessage({error: "The Python runner could not complete this request. Try again."});
    }
  };
  self.postMessage({stage: "ready"});
}

boot().catch(() => self.postMessage({error: "The Python runner could not load. Check your connection and try again."}));

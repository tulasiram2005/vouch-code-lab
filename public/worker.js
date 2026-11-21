// This disposable classic worker owns the interpreter. The page enforces a separate deadline.
self.onmessage = async ({data}) => {
  try {
    importScripts("./runtime/pyodide.js");
    const base = new URL("./runtime/", self.location.href).href;
    const py = await loadPyodide({indexURL: base, stdout: () => {}, stderr: () => {}});
    const response = await fetch(new URL("./engine.py", self.location.href));
    if (!response.ok) throw new Error("The practice engine could not load.");
    py.runPython(await response.text());
    self.postMessage({stage: "running"});
    py.globals.set("practice_request", JSON.stringify(data));
    const json = py.runPython(`
try:
    practice_result = {"result": practice(json.loads(practice_request))}
except (PracticeError, SyntaxError, RecursionError) as issue:
    practice_result = {"error": str(issue)}
json.dumps(practice_result, allow_nan=False)
    `);
    self.postMessage(JSON.parse(json));
  } catch (error) {
    self.postMessage({error: "The Python runner could not complete this request. Reload the page and try again."});
    console.warn("Practice worker error", error.name);
  }
};

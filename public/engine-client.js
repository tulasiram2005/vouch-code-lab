let spare = null;

function startWorker() {
  const worker = new Worker(new URL("./worker.js", import.meta.url));
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => fail("Python took too long to load. Check your connection and try again."), 90000);
    function fail(message) {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(message));
    }
    worker.onerror = () => fail("The Python runner could not start.");
    worker.onmessage = ({ data }) => {
      if (data.error) return fail(data.error);
      if (data.stage === "ready") {
        clearTimeout(timeout);
        resolve();
      }
    };
  });
  return { worker, ready, expires: null };
}

// Start one idle interpreter when the editor opens. Each execution consumes its worker.
export function preloadPractice() {
  if (spare) return spare.ready;
  const entry = startWorker();
  spare = entry;
  entry.ready.then(() => {
    if (spare === entry) entry.expires = setTimeout(() => {
      if (spare === entry) {
        spare = null;
        entry.worker.terminate();
      }
    }, 120000);
  }, () => {
    if (spare === entry) spare = null;
  });
  return entry.ready;
}

export async function runPractice(request, onStatus = () => {}) {
  const entry = spare || startWorker();
  spare = null;
  clearTimeout(entry.expires);
  onStatus("loading");
  await entry.ready;
  const { worker } = entry;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(reject, new Error(
      "Execution stopped at the time limit. Check loop bounds and recursion.",
    )), 12000);
    function finish(action, value) {
      clearTimeout(timeout);
      worker.terminate();
      action(value);
    }
    worker.onerror = () => finish(reject, new Error("The practice worker stopped."));
    worker.onmessage = ({ data }) => {
      if (data.error) finish(reject, new Error(data.error));
      else finish(resolve, data.result);
    };
    onStatus("running");
    worker.postMessage(request);
  });
}

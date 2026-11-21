export function runPractice(request, onStatus = () => {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.js", import.meta.url));
    let timeout;
    function finish(action, value) {
      clearTimeout(timeout);
      worker.terminate();
      action(value);
    }
    function deadline(milliseconds, message) {
      clearTimeout(timeout);
      timeout = setTimeout(() => finish(reject, new Error(message)), milliseconds);
    }
    deadline(90000, "Python took too long to load. Check your connection and try again.");
    worker.onerror = () => finish(reject, new Error("The practice worker could not start."));
    worker.onmessage = ({data}) => {
      if (data.stage) {
        deadline(12000, "Execution stopped at the time limit. Check loop bounds and recursion.");
        onStatus(data.stage);
      } else if (data.error) {
        finish(reject, new Error(data.error));
      } else {
        finish(resolve, data.result);
      }
    };
    worker.postMessage(request);
    onStatus("loading");
  });
}

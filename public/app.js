const main = document.querySelector("main");
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (item) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        item
      ],
  );
const pretty = (value) =>
  typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value);
const letter = (index) => String.fromCharCode(65 + index);
const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem("vouch:" + key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("vouch:" + key, JSON.stringify(value));
    } catch {}
  },
};
function restoredRound() {
  try {
    const round = JSON.parse(sessionStorage.getItem("vouch-round"));
    return round?.problem &&
      Array.isArray(round.probes) &&
      Array.isArray(round.answers)
      ? round
      : null;
  } catch {
    return null;
  }
}
function saveRound() {
  try {
    sessionStorage.setItem("vouch-round", JSON.stringify(state.round));
  } catch {}
}
const state = {
  drafts: {},
  tests: {},
  round: restoredRound(),
  problems: null,
  timer: null,
  visits: 0,
};
const page = (content) => '<div class="wrap page">' + content + "</div>";
const back = (url, label) =>
  '<a class="breadcrumb" href="#/' + url + '">← ' + label + "</a>";
const eyebrow = (label) => '<div class="eyebrow">' + label + "</div>";
const action = (label, link) =>
  '<a class="btn primary" href="#/' +
  link +
  '">' +
  label +
  ' <span aria-hidden="true">→</span></a>';
const field = (label, id, type = "text", attributes = "") =>
  '<label class="field">' +
  label +
  '<input id="' +
  id +
  '" type="' +
  type +
  '" ' +
  attributes +
  "></label>";
function message(id, value) {
  const node = $(id);
  if (node) node.textContent = value;
}
function formatLine(line) {
  return line
    .split(
      /(\b(?:def|if|for|in|return|else|elif|while|and|or|True|False|None)\b|\b\d+\b|\b[a-z_]\w*(?=\())/g,
    )
    .map((token, i) =>
      i % 2
        ? '<span class="' +
          (/^\d/.test(token)
            ? "num"
            : /^(def|if|for|in|return|else|elif|while|and|or|True|False|None)$/.test(
                  token,
                )
              ? "kw"
              : "fn") +
          '">' +
          esc(token) +
          "</span>"
        : esc(token),
    )
    .join("");
}
function codeView(source, mark) {
  return (
    '<pre class="code" tabindex="0" aria-label="Python source"><code>' +
    source
      .split("\n")
      .map(
        (line, i) =>
          '<span class="codeline' +
          (i + 1 === mark ? " marked" : "") +
          '"><b aria-hidden="true">' +
          String(i + 1).padStart(2, "0") +
          "</b>" +
          formatLine(line) +
          "</span>",
      )
      .join("") +
    "</code></pre>"
  );
}
function options(choices, className = "choices") {
  return (
    '<div class="' +
    className +
    '">' +
    choices
      .map(
        (val, i) =>
          '<button class="option" type="button" data-choice="' +
          i +
          '" aria-pressed="false"><small>' +
          letter(i) +
          "</small>" +
          esc(val) +
          "</button>",
      )
      .join("") +
    "</div>"
  );
}
async function home(visit) {
  const problem = (await catalog()).find((item) => item.id === "count-positives");
  if (visit !== state.visits) return;
  const example = problem.tests.find(({args}) => args[0].includes(0) && args[0].some(n => n > 0));
  const call = problem.functionName + "(" + JSON.stringify(example.args[0]).replaceAll(",", ", ") + ")";
  const demo = problem.starter;
  main.innerHTML =
    '<div class="wrap"><section class="hero"><div>' +
    eyebrow("Python practice studio") +
    '<h1>Know the code <br><em>you ship.</em></h1><p class="lead">One small change to your Python. Five questions about what happens next. Find out how well you understand what you wrote.</p><div class="actions">' +
    action("Open the library", "library") +
    '<a class="textlink" href="#/instructor">For instructors ↗</a></div></div><article class="demo" aria-label="Interactive code example"><div class="bar"><span class="file"><span class="dot"></span>count_positives.py</span><span class="tag">Live example</span></div>' +
    codeView(demo, 4) +
    '<div class="demo-foot"><div class="mini">Predict the return value</div><h2 class="question">What does <code>' + esc(call) + '</code> return?</h2>' +
    options([example.expected - 1, example.expected, example.expected + 1]) +
    '<p id="demo-feedback" class="feedback" aria-live="polite">Choose an answer to test your read.</p></div></article></section><section class="method">' +
    eyebrow("The method") +
    '<h2>Inside a Vouch round.</h2><div class="steps"><article class="step"><div class="mini">01 / Write</div><div class="specimen"><span class="file">solution.py</span><span class="preview-lines"><b>def solve(x):</b>　 return x</span></div><h3>Start with your code.</h3><p>Pick a Python problem, write a function, and run the examples in your browser.</p></article><article class="step"><div class="mini">02 / Predict</div><div class="specimen"><code>n &gt; 0</code><span aria-hidden="true">→</span><span class="tag">n &gt;= 0</span></div><h3>Read the change.</h3><p>Study a small mutation. Predict its output or choose an input that exposes it.</p></article><article class="step"><div class="mini">03 / Review</div><div class="specimen"><div class="tape"><span class="tile hit">✓</span><span class="tile hit">✓</span><span class="tile miss">×</span><span class="tile hit">✓</span><span class="tile hit">✓</span></div></div><h3>See your reasoning.</h3><p>Review each answer and use the explanations to plan your next practice round.</p></article></div></section><div class="charter note">A round captures how you interpreted a specific change. Use the result to guide practice or start a conversation about your code.</div></div>';
  main.querySelectorAll("[data-choice]").forEach(
    (button) =>
      (button.onclick = () => {
        main
          .querySelectorAll("[data-choice]")
          .forEach((el) =>
            el.setAttribute("aria-pressed", String(el === button)),
          );
        message(
          "demo-feedback",
          Number(button.dataset.choice) === 1
            ? "Correct. Only 2 and 4 are strictly positive, so the function returns 2."
            : "Zero does not pass value > 0. Only 2 and 4 contribute to the count.",
        );
      }),
  );
}
async function catalog() {
  if (state.problems) return state.problems;
  const response = await fetch("/problems.json");
  if (!response.ok) throw Error("Could not load the problem library.");
  return (state.problems = await response.json());
}
async function library(visit) {
  const list = await catalog();
  if (visit !== state.visits) return;
  main.innerHTML = page(
    eyebrow("Practice library") +
      '<h1 class="headline">Choose a problem.</h1><p class="lead">Each exercise starts with a Python function and ends with a round about your solution.</p><div class="rows">' +
      list
        .map(
          (p, i) =>
            '<a class="row" href="#/practice/' +
            encodeURIComponent(p.id) +
            '"><span class="mini">' +
            String(i + 1).padStart(2, "0") +
            "</span><div><strong>" +
            esc(p.title) +
            "</strong><p>" +
            esc(p.description) +
            '</p></div><span class="tag">' +
            esc(p.difficulty) +
            '</span><span class="arrow">↗</span></a>',
        )
        .join("") +
      "</div>",
  );
}
async function api(path, method = "GET", body, token) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json)
    throw Object.assign(
      Error(
        json?.error || "The records service is unavailable. Try again shortly.",
      ),
      { status: response.status },
    );
  return json;
}
function pyValue(value) {
  if (Array.isArray(value)) return "[" + value.map(pyValue).join(", ") + "]";
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}
function testList(problem, results = null) {
  return '<ol class="bench-cases">' + (results || problem.tests).map((test, i) => {
    const call = problem.functionName + "(" + test.args.map(pyValue).join(", ") + ")";
    const state = results ? (test.passed ? "pass" : "fail") : "example";
    const result = test.actual;
    const actual = typeof result === "string" && /^raises [A-Za-z]+Error$/.test(result)
      ? result : pyValue(result);
    const badge = results
      ? '<span class="bench-state ' + state + '">' + (test.passed ? "✓ Pass" : "× Fail") + '</span>'
      : '<span class="bench-index">' + String(i + 1).padStart(2, "0") + '</span>';
    return '<li class="bench-case ' + state + '">' + badge + '<div><code>' + esc(call) +
      ' <span aria-label="returns">→</span> ' + esc(pyValue(test.expected)) + '</code>' +
      (state === "fail" ? '<dl class="case-diff"><dt>Expected</dt><dd><code>' +
        esc(pyValue(test.expected)) + '</code></dd><dt>Returned</dt><dd><code>' +
        esc(actual) + '</code></dd></dl>' : '') + '</div></li>';
  }).join("") + '</ol>';
}
async function editor(id, visit) {
  const p = (await catalog()).find((x) => x.id === id);
  if (visit !== state.visits) return;
  if (!p) return missing();
  const draft = state.drafts[id] ?? storage.get("draft-" + id) ?? p.starter;
  main.innerHTML = page(
    back("library", "Problem library") +
      eyebrow(esc(p.category)) +
      '<h1 class="headline">' +
      esc(p.title) +
      '</h1><p class="lead">' +
      esc(p.description) +
      '</p><div class="cols"><section class="panel"><div class="bar"><span class="file"><span class="dot"></span>' +
      esc(p.functionName) +
      '.py</span><span class="mini">Python</span></div><div id="code-host"></div><textarea class="editor" id="editor-fallback" aria-label="Python solution" spellcheck="false" autocapitalize="off" autocomplete="off">' +
      esc(draft) +
      '</textarea><div class="bar"><span class="hint">Draft saved on this device</span><button class="btn" id="test">▷ Run tests</button></div></section><aside class="panel pad test-bench"><div class="mini">Test bench</div><h2>Examples</h2><div id="cases">' +
      testList(p, state.tests[id]) +
      '</div><p class="runtime-state" id="runtime-state" role="status" data-phase="loading"><span aria-hidden="true"></span>Loading Python on this device…</p><p class="hint" id="status" role="status">Pass the tests to begin a round.</p><details class="round-settings"><summary>Round settings <span aria-hidden="true"></span></summary>' +
      field("Cohort join code (optional)", "cohort", "text", 'maxlength="32"') +
      field(
        "Name for your instructor (optional)",
        "nickname",
        "text",
        'maxlength="60"',
      ) +
      '<label class="field">Practice pace<select id="pace"><option value="1">Standard</option><option value="1.5">1.5× time</option><option value="2">2× time</option></select></label></details><div class="actions"><button class="btn primary" id="begin">Start round →</button></div></aside></div>',
  );
  const initialTest = state.tests[id];
  $("begin").disabled = !(
    initialTest?.length && initialTest.every((t) => t.passed)
  );
  const fallback = $("editor-fallback");
  let read = () => fallback.value;
  let lock = value => { fallback.readOnly = value; };
  let busy = false;
  const query = new URLSearchParams(location.hash.split("?")[1] || "");
  if (query.has("cohort")) {
    $("cohort").value = query.get("cohort").slice(0, 32);
    main.querySelector(".round-settings").open = true;
  }
  function changed(code) {
    state.drafts[id] = code;
    storage.set("draft-" + id, code);
    delete state.tests[id];
    $("cases").innerHTML = testList(p);
    $("begin").disabled = true;
    message("status", "Run tests again after editing.");
  }
  fallback.oninput = () => changed(fallback.value);
  import("./codemirror.js").then(({ attachEditor }) => {
    if (visit !== state.visits) return;
    const editor = attachEditor($("code-host"), fallback.value, changed);
    lock = editor.lock;
    read = editor.read;
    lock(busy);
    fallback.remove();
    window.addEventListener("hashchange", editor.destroy, { once: true });
  }).catch(() => {
    if (visit === state.visits) message("status", "Plain-text editing is available. Run tests when ready.");
  });
  function runtimeStatus(phase, text) {
    if (visit !== state.visits) return;
    const status = $("runtime-state");
    status.dataset.phase = phase;
    status.lastChild.textContent = text;
  }
  const engine = import("./engine-client.js");
  function warm() {
    runtimeStatus("loading", "Loading Python on this device…");
    engine.then(({ preloadPractice }) => preloadPractice()).then(() => {
      if (!busy) runtimeStatus("ready", "Python ready");
    }).catch(() => {
      if (!busy) runtimeStatus("idle", "Run tests to retry loading Python.");
    });
  }
  warm();
  const run = async (mode) => {
    const source = read(),
      cohort = $("cohort").value.trim(),
      displayName = $("nickname").value.trim(),
      pace = Number($("pace").value);
    $("test").disabled = $("begin").disabled = true;
    busy = true;
    lock(true);
    message("status", "Starting the browser Python engine…");
    try {
      const { runPractice } = await engine;
      const result = await runPractice(
        { problem: p, code: source, mode, seed: 42 },
        (msg) => {
          if (msg === "loading") runtimeStatus("loading", "Loading Python on this device…");
          if (msg === "running") runtimeStatus("running", mode === "round" ? "Generating questions…" : "Running tests…");
        },
      );
      if (visit !== state.visits) return;
      state.tests[id] = result.tests;
      $("cases").innerHTML = testList(p, result.tests);
      if (mode === "round" && result.probes?.length) {
        const round = {
          problem: p,
          probes: result.probes,
          answers: [],
          pace,
          started: Date.now(),
          showTime: false,
          account: null,
          serverError: "",
        };
        message("status", "Opening the round…");
        try {
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(source),
          );
          const codeHash = Array.from(new Uint8Array(digest), (n) =>
            n.toString(16).padStart(2, "0"),
          ).join("");
          round.account = await api("/attempts", "POST", {
            problem: id,
            codeHash,
            probes: round.probes.map((q) => ({
              kind: q.kind,
              expected: String(q.correctIndex),
            })),
            ...(cohort ? { cohortCode: cohort } : {}),
            ...(displayName ? { displayName } : {}),
          });
        } catch (error) {
          if (cohort)
            throw Error("Could not join that cohort. " + error.message);
          round.serverError =
            "Local practice · sharing is unavailable for this round.";
        }
        if (visit !== state.visits) return;
        state.round = round;
        saveRound();
        location.hash = "/round";
        return;
      }
      message(
        "status",
        result.message ||
          (result.tests.every((t) => t.passed)
            ? "Tests passed. Your round is ready to generate."
            : "Review the failing examples."),
      );
    } catch (error) {
      if (visit === state.visits) message("status", error.message);
    } finally {
      if (visit === state.visits && $("test")) {
        $("test").disabled = false;
        busy = false;
        lock(false);
        if (mode === "test" && state.tests[id]?.every(t => t.passed)) warm();
        else runtimeStatus("idle", "Python runs on this device");
        $("begin").disabled = !state.tests[id]?.every((t) => t.passed);
      }
    }
  };
  $("test").onclick = () => run("test");
  $("begin").onclick = () => run("round");
}
function tape(round) {
  return (
    '<div class="tape" aria-label="Answer history">' +
    round.probes
      .map((_, i) => {
        const a = round.answers[i];
        return (
          '<span class="tile ' +
          (a ? (a.correct ? "hit" : "miss") : "") +
          '">' +
          (a
            ? (a.correct ? "✓" : "×") +
              " " +
              Math.round(a.elapsedMs / 1000) +
              "s"
            : String(i + 1).padStart(2, "0")) +
          "</span>"
        );
      })
      .join("") +
    "</div>"
  );
}
function roundSteps(round, current) {
  const items = round.probes.map((_, i) => {
    const answer = round.answers[i];
    const status = answer ? (answer.correct ? "Correct" : "Review") : i === current ? "Current" : "Upcoming";
    return '<li><button type="button" data-step="' + i + '" class="round-step ' +
      (answer ? "answered" : i === current ? "current" : "upcoming") + '"' +
      (i === current ? ' aria-current="step"' : "") + (i > current ? ' disabled' : '') +
      ' aria-label="Question ' + (i + 1) + ', ' + status + '">' +
      '<span class="step-number">' + (answer ? (answer.correct ? "✓" : "×") : (i + 1)) +
      '</span><span>Q' + (i + 1) + '</span></button></li>';
  }).join("");
  return '<ol class="round-steps" aria-label="Round progress">' + items +
    '</ol><div class="step-review" id="step-review" hidden></div>';
}
function lineComparison(q) {
  const changed = q.changedLine ?? q.code.split("\n")[q.line - 1];
  const original = q.originalLine ?? "Unavailable for this saved round";
  return '<div class="line-comparison" aria-label="Line ' + esc(q.line) + ' comparison">' +
    '<div><span>Original line</span><code>' + esc(original.trimStart()) + '</code></div>' +
    '<div><span>Changed line</span><code>' + esc(changed?.trimStart() || "") + '</code></div></div>';
}
let roundKeys;
function roundPage() {
  const r = state.round;
  if (!r) return resumeNotice();
  const i = r.answers.length,
    q = r.probes[i];
  if (!q) {
    location.replace("#/result");
    return;
  }
  const roundVisit = state.visits;
  r.questionAt ??= Date.now();
  saveRound();
  main.innerHTML = page(
    back("practice/" + r.problem.id, "Exit to editor") +
      eyebrow("Comprehension round") +
      '<h1 class="sectiontitle">' +
      esc(r.problem.title) +
      "</h1>" +
      (r.serverError ? '<p class="hint">' + esc(r.serverError) + "</p>" : "") +
      roundSteps(r, i) +
      '<div class="cols round-cols"><section class="panel round-source"><div class="bar"><span class="file">' +
      esc(r.problem.functionName) +
      '.py</span><span class="tag">Line ' + esc(q.line) + '</span></div>' +
      codeView(q.code, q.line) + lineComparison(q) +
      '</section><section class="panel pad"><div class="spread"><span class="mini">' +
      (q.kind === "Breaker" ? "Find the breaking input" : "Predict the output") +
      '</span><span class="file">' + (i + 1) + ' of ' + r.probes.length +
      '</span></div><div class="fuse"><progress id="fuse" aria-label="Suggested practice time"></progress></div><h2 class="question" tabindex="-1" id="round-question">' +
      esc(q.prompt) + '</h2>' + options(q.options, "answer-list") +
      '<p class="shortcut-hint hint">Choose with <kbd>A–D</kbd> or <kbd>1–4</kbd>.</p><div class="actions"><button class="btn primary" id="submit" disabled>Check answer →</button><button class="link" id="clock"></button></div><p class="hint" id="roundstatus" role="status"></p></section></div>',
  );
  const review = $("step-review");
  for (const step of main.querySelectorAll("button[data-step]")) {
    const n = Number(step.dataset.step);
    step.onclick = () => {
      if (n === i) {
        review.hidden = true;
        $("round-question").focus();
        return;
      }
      const answer = r.answers[n];
      if (!answer) return;
      const prev = r.probes[n];
      review.innerHTML = '<strong>Question ' + (n + 1) + ' · ' + (answer.correct ? "Correct" : "Review") +
        '</strong><p>' + esc(prev.prompt) + '</p><p>Your answer: <code>' + esc(prev.options[answer.selected]) +
        '</code> · Correct answer: <code>' + esc(prev.options[prev.correctIndex]) + '</code></p>';
      review.hidden = false;
    };
  }
  if (i > 0) $("round-question").focus({ preventScroll: true });
  let selected = null;
  const timer = () => {
    if (!$("clock")) return;
    const total = Math.ceil(36 * r.pace),
      left = Math.max(
        0,
        total - Math.floor((Date.now() - r.questionAt) / 1000),
      );
    $("fuse").max = total;
    $("fuse").value = left;
    $("clock").textContent = r.showTime
      ? left + "s · Hide timer"
      : "Show timer";
  };
  timer();
  clearInterval(state.timer);
  state.timer = setInterval(timer, 1000);
  $("clock").onclick = () => {
    r.showTime = !r.showTime;
    timer();
  };
  const buttons = [...main.querySelectorAll("[data-choice]")];
  buttons.forEach(
    (button, n) =>
      (button.onclick = () => {
        selected = n;
        buttons.forEach((el) =>
          el.setAttribute("aria-pressed", String(el === button)),
        );
        $("submit").disabled = false;
      }),
  );
  roundKeys?.abort();
  roundKeys = new AbortController();
  const controller = roundKeys;
  window.addEventListener("hashchange", () => controller.abort(), { once: true, signal: controller.signal });
  document.addEventListener("keydown", event => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.altKey || event.metaKey ||
        event.target?.closest?.("input, textarea, select, [contenteditable=true]")) return;
    const key = event.key.toLowerCase();
    const index = /^[1-4]$/.test(key) ? Number(key) - 1 : "abcd".indexOf(key);
    if (key.length !== 1 || index < 0 || !buttons[index] || buttons[index].disabled) return;
    event.preventDefault();
    buttons[index].focus();
    buttons[index].click();
  }, { signal: controller.signal });
  $("submit").onclick = async () => {
    const elapsedMs = Math.min(86400000, Date.now() - r.questionAt);
    let correct = selected === q.correctIndex;
    $("submit").disabled = true;
    buttons.forEach((el) => (el.disabled = true));
    if (r.account)
      try {
        const saved = await api(
          "/attempts/" + encodeURIComponent(r.account.id) + "/answers/" + i,
          "PUT",
          { answer: String(selected), elapsedMs },
          r.account.token,
        );
        correct = saved.correct;
      } catch (e) {
        if (roundVisit !== state.visits) return;
        message(
          "roundstatus",
          e.message + " Your answer is still selected. Retry when ready.",
        );
        $("submit").disabled = false;
        buttons.forEach((el) => (el.disabled = false));
        return;
      }
    r.answers.push({ selected, correct, elapsedMs });
    r.questionAt = null;
    saveRound();
    if (roundVisit !== state.visits) return;
    if (r.answers.length === r.probes.length) location.hash = "/result";
    else roundPage();
  };
}
function resumeNotice() {
  main.innerHTML = page(
    eyebrow("Practice studio") +
      '<h1 class="headline">Start a fresh round.</h1><p class="lead">Active rounds last for this tab session. Your code drafts are saved on this device.</p>' +
      action("Open library", "library"),
  );
}
const sampleCode = "VCH-SAMPLE";
const sampleRecord = {
  code: sampleCode, sample: true, publicName: "A. Rivera", problem: "count-positives",
  score: 4, total: 5, band: "Solid", issuedAt: "2026-01-15T12:00:00Z",
  outcomes: ["predict","breaker","predict","breaker","predict"].map((kind,index)=>({kind,correct:index!==2}))
};
function recordLabel(count) { return count===5 ? "Certificate of practice" : "Practice record"; }
function probeLabel(kind) {
  return ({predict:"Predict the output",breaker:"Find the breaking input",line:"Locate the change"})[String(kind).toLowerCase()] || "Code question";
}
function normalizedCode(raw) {
  let value=String(raw).trim();
  if(/^https?:\/\//i.test(value)){
    try {const url=new URL(value);value=decodeURIComponent((url.hash || url.pathname).split("/").filter(Boolean).pop() || "");}
    catch {return null;}
  }
  const compact=value.normalize("NFKC").toUpperCase().replace(/[\s\u2010-\u2015\u2212-]+/gu,"");
  if(compact==="VCHSAMPLE")return sampleCode;
  const digits=compact.replace(/^VCH/,"");
  return /^[0-9A-F]{16}$/.test(digits)?"VCH-"+digits.match(/.{4}/g).join("-"):null;
}
function nameControls(r){
  const mode=r.nameMode || (r.record?.publicName?"full":"private");
  const choices=[["private","Keep my name private"],["initials","Show my initials"],["full","Show my full name"]];
  return '<fieldset class="name-preference"><legend>Name on the public record</legend><label class="field">Display preference<select id="name-mode">'+choices.map(([v,label])=>'<option value="'+v+'" '+(v===mode?"selected":"")+'>'+label+'</option>').join("")+'</select></label><label class="field" id="public-field" '+(mode==="private"?"hidden":"")+'><span id="name-label">'+(mode==="initials"?"Your initials":"Your full name")+'</span><input id="public-name" maxlength="80" value="'+esc(r.record?.publicName || "")+'" autocomplete="off"></label><p class="hint">Anyone with the verification link can see the name or initials you choose to share.</p></fieldset>';
}
function resultPage() {
  const r=state.round;
  if(!r || r.answers.length!==r.probes.length)return resumeNotice();
  const count=r.answers.length, score=r.answers.filter(x=>x.correct).length;
  const band=score/count>=.8?"Solid":score/count>=.4?"Partial":"Shaky";
  const label=recordLabel(count), shortLabel=count===5?"certificate":"practice record";
  main.innerHTML=page(eyebrow("Round review")+'<h1 class="headline">'+band+' understanding.</h1><p class="lead">'+score+' of '+count+' correct on '+esc(r.problem.title)+'. Review the code changes and the reasoning behind each answer.</p>'+tape(r)+'<div class="rows">'+r.probes.map((q,i)=>'<details class="case"><summary><b class="'+(r.answers[i].correct?'good':'bad')+'">'+(r.answers[i].correct?'Correct':'Review')+'</b> · '+esc(probeLabel(q.kind))+' · '+esc(q.prompt)+'</summary>'+codeView(q.code,q.line)+'<p>Your answer <code>'+esc(q.options[r.answers[i].selected])+'</code> · Correct answer <code>'+esc(q.options[q.correctIndex])+'</code></p><p>'+esc(q.explanation)+'</p></details>').join("")+'</div>'+
    (r.account?'<section class="record-tools"><h2>'+label+'</h2>'+nameControls(r)+'<div class="actions"><button class="btn primary" type="button" id="claim">Open '+shortLabel+' →</button><button class="link" id="erase">Delete attempt</button></div></section>':'<p class="hint">This round was completed locally. Public verification requires a saved server record.</p>')+
    '<p id="resultstatus" role="status"></p>'+action("Return to library","library"));
  if(!r.account)return;
  const claim=$("claim"),status=$("resultstatus"),mode=$("name-mode"),name=$("public-name");
  mode.onchange=()=>{
    if(mode.value==="initials" && name.value.trim()){
      name.value=name.value.trim().split(/\s+/).map(s=>Array.from(s)[0]).slice(0,8).join("").toLocaleUpperCase();
    }
    $("public-field").hidden=mode.value==="private";
    message("name-label",mode.value==="initials"?"Your initials":"Your full name");
    name.setCustomValidity("");
    if(mode.value!=="private")name.focus();
  };
  name.oninput=()=>name.setCustomValidity("");
  const finalize=(body)=>api("/attempts/"+r.account.id+"/finalize","POST",body,r.account.token);
  if(!r.record){
    claim.disabled=true; status.textContent="Saving your result…";
    finalize({}).then(rec=>{r.record=rec;saveRound();if(status.isConnected)status.textContent="Your result is saved.";})
      .catch(err=>{if(status.isConnected)status.textContent=err.message+" Open the record to retry.";})
      .finally(()=>{claim.disabled=false;});
  }
  claim.onclick=async()=>{
    const publicName=mode.value==="private"?null:name.value.trim();
    if(mode.value!=="private" && (!publicName || mode.value==="initials"&&!/^[\p{L}\p{M}.\s-]{1,12}$/u.test(publicName))){
      name.setCustomValidity(mode.value==="initials"?"Enter your initials, up to 12 characters.":"Enter the name you want to share.");name.reportValidity();return;
    }
    claim.disabled=true;
    try{
      r.record=await finalize({publicName});r.nameMode=mode.value;saveRound();
      if(claim.isConnected)location.hash="/verify/"+encodeURIComponent(r.record.code);
    }catch(e){if(claim.isConnected){status.textContent=e.message;claim.disabled=false;}}
  };
  $("erase").onclick=async()=>{
    if(!confirm("Permanently delete this attempt and revoke its public record?"))return;
    try{await api("/attempts/"+r.account.id,"DELETE",null,r.account.token);r.account=null;r.record=null;saveRound();resultPage();message("resultstatus","Your server record was deleted.");}
    catch(e){status.textContent=e.message;}
  };
}
function certificateMarkup(cert,problem,url) {
  const title=recordLabel(cert.outcomes.length);
  const date=new Date(cert.issuedAt).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  return '<article class="cert" aria-labelledby="record-title"><div class="record-heading"><span class="label">'+(cert.sample?"Sample document":"Vouch · Python studio")+'</span><span class="stamp">'+(cert.sample?"SAMPLE":"VOUCH")+'</span></div><h2 id="record-title">'+title+'</h2>'+(cert.publicName?'<p class="record-name">'+esc(cert.publicName)+'</p>':'')+'<p class="record-problem">'+esc(problem)+'</p><div class="record-score"><strong>'+cert.score+' / '+cert.total+'</strong><span>'+esc(cert.band)+' understanding<br>'+esc(date)+'</span></div><ol class="outcome-list">'+cert.outcomes.map(o=>'<li><span>'+esc(probeLabel(o.kind))+'</span><strong>'+(o.correct?"✓ Correct":"× Incorrect")+'</strong></li>').join("")+'</ol><p class="record-disclosure">'+(cert.sample?"This sample illustrates a five-question round. No learner submission is associated with this code.":"Verifies that Vouch recorded this round. It does not prove who wrote the code.")+'</p><div class="record-auth">Verification code</div><code>'+esc(cert.code)+'</code><a class="record-url" href="'+esc(url)+'">'+esc(url)+'</a></article>';
}
async function verification(raw,visit) {
  main.innerHTML=page('<div class="verify-tools">'+eyebrow("Public verification")+'<h1 class="headline">Verify a result.</h1><p class="lead">Enter a record code or paste a verification link to see the recorded outcome.</p><form class="inputrow slim" id="lookup">'+field("Verification code or link","code","text",'placeholder="VCH-XXXX-XXXX-XXXX-XXXX" maxlength="400" required autocomplete="off" autocapitalize="characters"')+'<button class="btn primary">Verify →</button></form><a class="textlink" href="#/verify/'+sampleCode+'">Try a sample certificate →</a></div><div class="record-pane" id="record" role="status"></div>');
  const code=normalizedCode(raw), input=$("code");
  input.value=code || raw || "";
  const invalid=()=>{$("record").innerHTML='<div class="record-notice"><h2>Invalid code format</h2><p>Enter the four groups of letters and numbers after VCH, or paste a complete verification link.</p></div>';};
  input.onpaste=e=>{
    const text=e.clipboardData?.getData("text/plain"), parsed=normalizedCode(text);
    if(parsed){e.preventDefault();input.value=parsed;}
  };
  $("lookup").onsubmit=e=>{e.preventDefault();const next=normalizedCode(input.value);if(!next){invalid();return;}input.value=next;if(next===raw)verification(next,state.visits);else location.hash="/verify/"+encodeURIComponent(next);};
  if(!raw)return;
  if(!code){invalid();return;}
  message("record","Looking up the public record…");
  try{
    const cert=code===sampleCode?sampleRecord:await api("/verify/"+encodeURIComponent(code));
    const list=await catalog().catch(()=>[]);
    if(visit!==state.visits)return;
    const title=list.find(p=>p.id===cert.problem)?.title || cert.problem;
    const url=location.origin+"/v/"+encodeURIComponent(cert.code);
    $("record").innerHTML=certificateMarkup(cert,title,url)+'<div class="actions record-actions"><button class="btn" id="print">Print '+(cert.total===5?'certificate':'practice record')+'</button><button class="btn" id="copy">Copy verification link</button></div><p id="copied" role="status"></p>';
    $("print").onclick=()=>window.print();
    $("copy").onclick=async()=>{try{await navigator.clipboard.writeText(url);message("copied","Verification link copied.");}catch{message("copied",url);}};
  }catch(e){
    if(visit!==state.visits)return;
    const [title,detail]=e.status===410?["Record revoked","The record owner deleted this attempt. Its score and learner details are no longer public."]:e.status===404?["Record not found","Check the code against the original record. Verification links expire after 30 days."]:["Verification unavailable",e.message];
    $("record").innerHTML='<div class="record-notice"><h2>'+title+'</h2><p>'+esc(detail)+'</p></div>';
  }
}
function groupedJoinCode(code) {
  return code.match(/.{1,4}/g).join("-");
}

function emptySteps(steps) {
  return '<ol class="cohort-steps">' + steps.map((step) => '<li>' + esc(step) + '</li>').join('') + '</ol>';
}

function instructorAuth(notice = "") {
  main.innerHTML = page(
    eyebrow("Instructor studio") +
      '<h1 class="headline">Your teaching desk.</h1><p class="lead">Create a cohort, share a join code, and review the concepts worth discussing with your learners.</p><form class="panel pad auth" id="login"><h2>Instructor access</h2>' +
      field("Email", "email", "email", 'required autocomplete="username" maxlength="254" placeholder="you@school.edu"') +
      field("Password", "password", "password", 'required autocomplete="current-password" maxlength="128" placeholder="Enter your password"') +
      '<p class="hint">For a new account, choose a password with at least 12 characters.</p><div class="actions"><button class="btn primary" value="login">Sign in →</button><button class="btn" value="register">Create account</button></div><p id="authmsg" role="status">' +
      esc(notice) + "</p></form>",
  );
  $("login").onsubmit = async (e) => {
    e.preventDefault();
    const mode = e.submitter?.value || "login",
      form = e.currentTarget,
      buttons = [...form.querySelectorAll("button")];
    buttons.forEach((b) => (b.disabled = true));
    try {
      await api("/instructor/" + mode, "POST", {
        email: $("email").value.trim(),
        password: $("password").value,
      });
      if (form.isConnected) await instructor(state.visits);
    } catch (err) {
      if (form.isConnected) message("authmsg", err.message);
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  };
}

async function instructor(visit) {
  let data;
  try {
    data = await api("/cohorts");
  } catch (e) {
    if (visit === state.visits) instructorAuth(e.status === 401 ? "" : e.message);
    return;
  }
  const list = await catalog();
  if (visit !== state.visits) return;
  main.innerHTML = page(
    '<div class="spread">' + eyebrow("Instructor studio") +
      '<button class="btn" id="logout">Sign out</button></div><h1 class="headline">Your cohorts.</h1><div class="cols"><section class="panel pad"><h2>Active cohorts</h2>' +
      (data.cohorts.length
        ? '<div class="cohort-list">' + data.cohorts.map((c) => {
            const assigned = list.find((p) => p.id === c.problem);
            return '<a class="cohort-list-row" href="#/cohort/' + encodeURIComponent(c.id) + '"><span><strong>' +
              esc(c.name) + '</strong><small>' + esc(assigned?.title || "Archived problem") +
              '</small></span><span aria-hidden="true">→</span></a>';
          }).join('') + '</div>'
        : '<p class="copy">Set up your first cohort to follow a group through a practice round.</p>' +
          emptySteps(["Name your cohort and choose a problem.", "Share the join link with your learners.", "Open the board to review their rounds."])) +
      '</section><form class="panel pad" id="create"><h2>Create a cohort</h2>' +
      field("Cohort name", "name", "text", 'maxlength="80" placeholder="e.g. Tuesday Python lab" required') +
      '<label class="field">Assigned problem<span class="cohort-select"><select id="assignment">' +
      list.map((p) => '<option value="' + esc(p.id) + '">' + esc(p.title) + ' · ' + esc(p.difficulty) + '</option>').join("") +
      '</select></span></label><button class="btn primary">Create cohort →</button></form></div><p id="manage-status" role="status"></p>',
  );
  $("logout").onclick = async () => {
    try {
      await api("/instructor/logout", "POST", {});
      if (visit === state.visits) instructorAuth();
    } catch (e) {
      if (visit === state.visits) message("manage-status", e.message);
    }
  };
  $("create").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.submitter;
    b.disabled = true;
    try {
      const c = await api("/cohorts", "POST", {name: $("name").value.trim(), problem: $("assignment").value});
      if (visit === state.visits) location.hash = "/cohort/" + encodeURIComponent(c.id);
    } catch (err) {
      if (visit === state.visits) message("manage-status", err.message);
    } finally {
      b.disabled = false;
    }
  };
}

async function cohort(id, visit) {
  const path = "/cohorts/" + encodeURIComponent(id);
  const [c, problems] = await Promise.all([api(path), catalog()]);
  if (visit !== state.visits) return;
  const assigned = problems.find((p) => p.id === c.problem);
  const rows = c.attempts,
    attention = rows.filter((a) => a.band === "Shaky" || a.band === "Partial").sort((a, b) => a.score - b.score);
  main.innerHTML = page(
    back("instructor", "All cohorts") + eyebrow("Cohort board") +
      '<h1 class="headline">' + esc(c.name) + '</h1><p class="lead">Assigned problem · ' +
      esc(assigned?.title || "Archived problem") + '</p>' +
      '<section class="panel cohort-invite" aria-labelledby="invite-title"><div class="cohort-invite-head"><h2 id="invite-title">Invite learners</h2><button class="textlink cohort-rotate-trigger" id="rotate-code" type="button">Regenerate code</button></div>' +
      '<div class="bar cohort-invite-tools"><div class="join-token"><span class="mini">Join code</span><span class="file"><strong id="join-code"></strong></span></div>' +
      '<div class="cohort-invite-actions"><button class="btn" id="copy-code" type="button">Copy code</button><button class="btn" id="copy-join-link" type="button">Copy join link</button><a class="textlink" id="join-link">Open join link ↗</a></div></div>' +
      '<p id="invite-status" role="status"></p><div id="manual-invite" hidden><label class="field">Select and copy<input id="manual-invite-value" readonly></label></div></section>' +
      '<dialog id="rotate-dialog" class="cohort-dialog panel pad" aria-labelledby="rotate-heading" aria-describedby="rotate-description"><h2 id="rotate-heading">Regenerate join code?</h2><p id="rotate-description">The current code and join link will stop accepting new learners. Rounds already on the board will stay here.</p><form method="dialog" class="actions"><button class="btn" value="cancel" autofocus>Keep current code</button><button class="btn primary" value="rotate">Regenerate code</button></form></dialog>' +
      '<div class="cohort-board-title"><h2 class="sectiontitle">' + (rows.length ? 'Worth a conversation' : 'Learner results') +
      '</h2><button class="btn" id="refresh">Refresh</button></div>' +
      (rows.length
        ? '<p class="note">Invite learners to explain a change they found difficult. Time is context for a conversation and carries no scoring penalty.</p>' +
          (attention.length ? attention.map((a) => '<div class="case">' + esc(a.displayName || "Anonymous learner") + ' · ' + esc(a.score) + ' / ' + esc(a.total) + '</div>').join("")
            : '<p class="copy">No completed rounds currently need a follow-up.</p>') +
          '<h2 class="sectiontitle">Learner results</h2><div class="scroll"><table><thead><tr><th>Learner</th><th>Round</th><th>Score</th><th>Band</th></tr></thead><tbody>' +
          rows.map((a) => "<tr><td>" + esc(a.displayName || "Anonymous learner") + "</td><td>" + esc(a.status) + "</td><td>" +
            esc(a.score ?? "—") + " / " + esc(a.total) + "</td><td>" + esc(a.band || "—") + "</td></tr>").join("") + "</tbody></table></div>"
        : '<div class="panel pad"><h3>Waiting for the first round</h3>' +
          emptySteps(["Send the join link or code to your learners.", "Ask each learner to run the tests and begin a round.", "Refresh this board to see their progress."]) + '</div>'),
  );

  function updateInvite() {
    $("join-code").textContent = groupedJoinCode(c.joinCode);
    $("join-link").href = new URL('/#/practice/' + encodeURIComponent(c.problem) + '?cohort=' + encodeURIComponent(c.joinCode), location.origin).href;
    $("manual-invite").hidden = true;
    $("manual-invite-value").value = "";
  }
  updateInvite();
  async function copy(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      if (visit !== state.visits) return;
      $("manual-invite").hidden = true;
      message("invite-status", label + " copied.");
    } catch {
      if (visit !== state.visits) return;
      $("manual-invite").hidden = false;
      $("manual-invite-value").value = value;
      $("manual-invite-value").focus();
      $("manual-invite-value").select();
      message("invite-status", "Use your device’s Copy command.");
    }
  }
  $("copy-code").onclick = () => copy(groupedJoinCode(c.joinCode), "Join code");
  $("copy-join-link").onclick = () => copy($("join-link").href, "Join link");
  const dialog = $("rotate-dialog"), trigger = $("rotate-code");
  trigger.onclick = () => {
    dialog.returnValue = "";
    dialog.showModal();
  };
  dialog.onclose = async () => {
    if (dialog.returnValue !== "rotate") return;
    trigger.disabled = true;
    try {
      const updated = await api(path + "/regenerate-code", "POST", {currentCode: c.joinCode});
      if (visit !== state.visits) return;
      c.joinCode = updated.joinCode;
      updateInvite();
      message("invite-status", "New join code ready. Share the updated link with learners.");
    } catch (err) {
      if (visit === state.visits) message("invite-status", err.message);
    } finally {
      trigger.disabled = false;
      if (visit === state.visits) trigger.focus();
    }
  };
  $("refresh").onclick = route;
}
function missing() {
  main.innerHTML = page(
    eyebrow("Page unavailable") +
      '<h1 class="headline">This page has moved.</h1>' +
      action("Back to the studio", ""),
  );
}
async function route() {
  clearInterval(state.timer);
  const visit = ++state.visits;
  const path = location.hash.startsWith("#/")
    ? location.hash.slice(2)
    : location.pathname.startsWith("/v/")
      ? "verify/" + location.pathname.slice(3)
      : location.pathname === "/"
        ? ""
        : location.pathname.slice(1);
  const [view, slug] = path.split("?")[0].split("/");
  let id;
  try {
    id = decodeURIComponent(slug || "");
  } catch {
    return missing();
  }
  document.querySelectorAll("nav a").forEach((a) => {
    const match =
      a.hash === "#/" + view ||
      (view === "practice" && a.hash === "#/library") ||
      (view === "cohort" && a.hash === "#/instructor");
    a.classList.toggle("active", match);
    if (match) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  main.innerHTML = page('<p role="status">Opening the studio…</p>');
  window.scrollTo(0, 0);
  try {
    switch (view) {
      case "":
        await home(visit);
        break;
      case "library":
        await library(visit);
        break;
      case "practice":
        await editor(id, visit);
        break;
      case "round":
        roundPage();
        break;
      case "result":
        resultPage();
        break;
      case "verify":
        await verification(id, visit);
        break;
      case "instructor":
        await instructor(visit);
        break;
      case "cohort":
        await cohort(id, visit);
        break;
      default:
        missing();
    }
  } catch (e) {
    if (visit === state.visits) {
      main.innerHTML = page(
        eyebrow("Studio unavailable") +
          '<h1 class="headline">Let’s try again.</h1><p class="lead">' +
          esc(e.message) +
          '</p><button class="btn primary" id="retry">Retry</button>',
      );
      $("retry").onclick = route;
    }
  }
  if (visit === state.visits) {
    const title = main.querySelector("h1")?.textContent;
    document.title = (title ? title + " · " : "") + "Vouch";
    if (visit > 1) main.focus({ preventScroll: true });
  }
}
const themeButton = document.querySelector(".theme");
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  themeButton.setAttribute("aria-label", label);
  themeButton.title = label;
}
setTheme(storage.get("theme") === "light" ? "light" : "dark");
themeButton.onclick = () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(next);
  storage.set("theme", next);
};
document.querySelector(".skip").onclick = (event) => {
  event.preventDefault();
  main.focus();
};
function connectivity() {
  $("offline").hidden = navigator.onLine;
}
window.addEventListener("online", connectivity);
window.addEventListener("offline", connectivity);
connectivity();
window.addEventListener("hashchange", route);
route();

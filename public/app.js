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
function home() {
  const demo =
    "def count_positive(nums):\n    count = 0\n    for n in nums:\n        if n >= 0:\n            count += 1\n    return count";
  main.innerHTML =
    '<div class="wrap"><section class="hero"><div>' +
    eyebrow("Python practice studio") +
    '<h1>Know the code <br><em>you ship.</em></h1><p class="lead">One small change to your Python. Five questions about what happens next. Find out how well you understand what you wrote.</p><div class="actions">' +
    action("Open the library", "library") +
    '<a class="textlink" href="#/instructor">For instructors ↗</a></div></div><article class="demo" aria-label="Interactive code example"><div class="bar"><span class="file"><span class="dot"></span>count_positive.py</span><span class="tag">Live probe</span></div>' +
    codeView(demo, 4) +
    '<div class="demo-foot"><div class="mini">Predict the return value</div><h2 class="question">What does it return for <code>[-1, 0, 2]</code>?</h2>' +
    options(["1", "2", "3"]) +
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
            ? "Correct. Both 0 and 2 satisfy n >= 0, so the function returns 2."
            : "Trace 0 and 2 through the highlighted line. Both satisfy n >= 0, so the answer is 2.",
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
function testList(results) {
  return results
    .map(
      (t) =>
        '<div class="case"><b class="' +
        (t.passed ? "good" : "bad") +
        '">' +
        (t.passed ? "Pass" : "Check") +
        "</b> <code>" +
        esc(pretty(t.args)) +
        "</code><br>Expected <code>" +
        esc(pretty(t.expected)) +
        "</code> · Returned <code>" +
        esc(pretty(t.actual)) +
        "</code></div>",
    )
    .join("");
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
      '.py</span><span class="mini">Python</span></div><label class="skip" for="editor">Python solution</label><textarea class="editor" id="editor" aria-label="Python solution" spellcheck="false" autocapitalize="off" autocomplete="off">' +
      esc(draft) +
      '</textarea><div class="bar"><span class="hint">Draft saved on this device</span><button class="btn" id="test">▷ Run tests</button></div></section><aside class="panel pad"><div class="mini">Test bench</div><h2>Examples</h2><div id="cases">' +
      (state.tests[id]
        ? testList(state.tests[id])
        : p.tests
            .map(
              (t) =>
                '<div class="case"><code>' +
                esc(pretty(t.args)) +
                " → " +
                esc(pretty(t.expected)) +
                "</code></div>",
            )
            .join("")) +
      '</div><p class="hint" id="status" role="status">Pass the tests to begin a round.</p><details><summary>Round settings</summary>' +
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
  $("editor").oninput = () => {
    state.drafts[id] = $("editor").value;
    storage.set("draft-" + id, state.drafts[id]);
    delete state.tests[id];
    $("begin").disabled = true;
    message("status", "Run tests again after editing.");
  };
  const run = async (mode) => {
    const source = $("editor").value,
      cohort = $("cohort").value.trim(),
      displayName = $("nickname").value.trim(),
      pace = Number($("pace").value);
    $("test").disabled = $("begin").disabled = true;
    $("editor").readOnly = true;
    message("status", "Starting the browser Python engine…");
    try {
      const { runPractice } = await import("./engine-client.js");
      const result = await runPractice(
        { problem: p, code: source, mode, seed: 42 },
        (msg) => {
          if (state.visits === visit)
            message(
              "status",
              msg === "loading"
                ? "Loading Python on this device…"
                : msg === "running"
                  ? "Checking your code…"
                  : String(msg),
            );
        },
      );
      if (visit !== state.visits) return;
      state.tests[id] = result.tests;
      $("cases").innerHTML = testList(result.tests);
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
        $("editor").readOnly = false;
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
      '<div class="cols"><section class="panel"><div class="bar"><span class="file">Mutation / ' +
      esc(r.problem.functionName) +
      '.py</span><span class="tag">Line ' +
      esc(q.line) +
      "</span></div>" +
      codeView(q.code, q.line) +
      '</section><section class="panel pad"><div class="spread"><span class="mini">' +
      esc(q.kind) +
      '</span><span class="file">' +
      (i + 1) +
      " of " +
      r.probes.length +
      '</span></div><div class="fuse"><progress id="fuse" aria-label="Suggested practice time"></progress></div><h2 class="question">' +
      esc(q.prompt) +
      "</h2>" +
      options(q.options, "answer-list") +
      '<div class="actions"><button class="btn primary" id="submit" disabled>Record answer →</button><button class="link" id="clock"></button></div><p class="hint" id="roundstatus" role="status"></p></section></div><div class="spaced">' +
      tape(r) +
      "</div>",
  );
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
function resultPage() {
  const r = state.round;
  if (!r || r.answers.length !== r.probes.length) return resumeNotice();
  const score = r.answers.filter((x) => x.correct).length,
    band =
      score / r.probes.length >= 0.8
        ? "Solid"
        : score / r.probes.length >= 0.4
          ? "Partial"
          : "Shaky";
  main.innerHTML = page(
    eyebrow("Round review") +
      '<h1 class="headline">' +
      esc(band) +
      ' understanding.</h1><p class="lead">' +
      score +
      " of " +
      r.probes.length +
      " correct on " +
      esc(r.problem.title) +
      ". Review the code changes and the reasoning behind each answer.</p>" +
      tape(r) +
      '<div class="rows">' +
      r.probes
        .map(
          (q, i) =>
            '<details class="case"><summary><b class="' +
            (r.answers[i].correct ? "good" : "bad") +
            '">' +
            (r.answers[i].correct ? "Correct" : "Review") +
            "</b> · " +
            esc(q.kind) +
            " · " +
            esc(q.prompt) +
            "</summary>" +
            codeView(q.code, q.line) +
            "<p>Your answer <code>" +
            esc(q.options[r.answers[i].selected]) +
            "</code> · Correct answer <code>" +
            esc(q.options[q.correctIndex]) +
            "</code></p><p>" +
            esc(q.explanation) +
            "</p></details>",
        )
        .join("") +
      '</div><div class="actions">' +
      (r.account
        ? '<button class="btn primary" id="claim">Open certificate →</button><button class="link" id="erase">Delete attempt</button>'
        : '<span class="hint">This round was completed locally. A public certificate requires the records service.</span>') +
      action("Return to library", "library") +
      '</div><p id="resultstatus" role="status"></p>',
  );
  if (!r.account) return;
  // Closing a completed round records it on the instructor board. Finalization is idempotent.
  const claim = $("claim"),
    status = $("resultstatus");
  if (!r.record) {
    claim.disabled = true;
    status.textContent = "Saving your result…";
    api("/attempts/" + r.account.id + "/finalize", "POST", {}, r.account.token)
      .then((record) => {
        r.record = record;
        saveRound();
        if (status.isConnected) status.textContent = "Your result is saved.";
      })
      .catch((error) => {
        if (status.isConnected)
          status.textContent =
            error.message + " Use Open certificate to retry.";
      })
      .finally(() => {
        claim.disabled = false;
      });
  }
  $("claim").onclick = async () => {
    const b = $("claim");
    b.disabled = true;
    try {
      const record =
        r.record ||
        (await api(
          "/attempts/" + r.account.id + "/finalize",
          "POST",
          {},
          r.account.token,
        ));
      r.record = record;
      saveRound();
      if (b.isConnected)
        location.hash = "/verify/" + encodeURIComponent(record.code);
    } catch (e) {
      if (b.isConnected) {
        message("resultstatus", e.message);
        b.disabled = false;
      }
    }
  };
  $("erase").onclick = async () => {
    if (!confirm("Delete this attempt and its public certificate permanently?"))
      return;
    try {
      await api("/attempts/" + r.account.id, "DELETE", null, r.account.token);
      r.account = null;
      saveRound();
      resultPage();
      message("resultstatus", "Your server record was deleted.");
    } catch (e) {
      message("resultstatus", e.message);
    }
  };
}
async function verification(code, visit) {
  main.innerHTML = page(
    eyebrow("Public verification") +
      '<h1 class="headline">Verify a result.</h1><p class="lead">Look up the problem, score, and probe outcomes using a certificate code.</p><form class="inputrow slim" id="lookup">' +
      field(
        "Certificate code",
        "code",
        "text",
        'placeholder="VCH-…" maxlength="80" required autocomplete="off"',
      ) +
      '<button class="btn primary">Verify →</button></form><div class="slim" id="record" role="status"></div>',
  );
  $("code").value = code || "";
  $("lookup").onsubmit = (e) => {
    e.preventDefault();
    const next = $("code").value.trim().toUpperCase();
    if (next === code) verification(code, state.visits);
    else location.hash = "/verify/" + encodeURIComponent(next);
  };
  if (!code) return;
  message("record", "Looking up the public record…");
  try {
    const cert = await api("/verify/" + encodeURIComponent(code));
    if (visit !== state.visits) return;
    const problem =
      state.problems?.find((p) => p.id === cert.problem)?.title || cert.problem;
    $("record").innerHTML =
      '<article class="cert"><div class="spread"><span class="label">Certificate of practice</span><span class="stamp">VOUCH</span></div><h2>' +
      esc(problem) +
      '</h2><p class="big-num">' +
      esc(cert.score) +
      " / " +
      esc(cert.total) +
      "</p><p>" +
      esc(cert.band) +
      " · " +
      esc(
        new Date(cert.issuedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      ) +
      "</p><code>" +
      esc(cert.code) +
      "</code><hr><p>" +
      cert.outcomes
        .map(
          (o, i) =>
            "Probe " +
            (i + 1) +
            " · " +
            esc(o.kind) +
            " · " +
            (o.correct ? "Correct" : "Incorrect"),
        )
        .join("<br>") +
      '</p></article><div class="actions"><button class="btn" id="print">Print certificate</button><button class="btn" id="copy">Copy verification link</button></div><p id="copied" role="status"></p>';
    $("print").onclick = () => window.print();
    $("copy").onclick = async () => {
      const url = location.origin + "/v/" + encodeURIComponent(cert.code);
      try {
        await navigator.clipboard.writeText(url);
        message("copied", "Verification link copied.");
      } catch {
        message("copied", url);
      }
    };
  } catch (e) {
    if (visit === state.visits) message("record", e.message);
  }
}
function instructorAuth(notice = "") {
  main.innerHTML = page(
    eyebrow("Instructor studio") +
      '<h1 class="headline">Your teaching desk.</h1><p class="lead">Create a cohort, share a join code, and review the concepts worth discussing with your learners.</p><form class="panel pad auth" id="login"><h2>Instructor access</h2>' +
      field(
        "Email",
        "email",
        "email",
        'required autocomplete="username" maxlength="254"',
      ) +
      field(
        "Password",
        "password",
        "password",
        'required autocomplete="current-password" maxlength="128"',
      ) +
      '<p class="hint">For a new account, choose a password with at least 12 characters.</p><div class="actions"><button class="btn primary" value="login">Sign in →</button><button class="btn" value="register">Create account</button></div><p id="authmsg" role="status">' +
      esc(notice) +
      "</p></form>",
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
    if (visit === state.visits)
      instructorAuth(e.status === 401 ? "" : e.message);
    return;
  }
  const list = await catalog();
  if (visit !== state.visits) return;
  main.innerHTML = page(
    '<div class="spread">' +
      eyebrow("Instructor studio") +
      '<button class="btn" id="logout">Sign out</button></div><h1 class="headline">Your cohorts.</h1><div class="cols"><section class="panel pad"><h2>Active cohorts</h2><div class="rows">' +
      (data.cohorts.length
        ? data.cohorts
            .map(
              (c) =>
                '<a class="row" href="#/cohort/' +
                encodeURIComponent(c.id) +
                '"><span>↗</span><strong>' +
                esc(c.name) +
                '</strong><span class="file">' +
                esc(c.joinCode) +
                "</span></a>",
            )
            .join("")
        : '<p class="copy">Create a cohort to start collecting practice results.</p>') +
      '</div></section><form class="panel pad" id="create"><h2>Create a cohort</h2>' +
      field("Cohort name", "name", "text", 'maxlength="80" required') +
      '<label class="field">Assigned problem<select id="assignment">' +
      list
        .map(
          (p) =>
            '<option value="' + esc(p.id) + '">' + esc(p.title) + "</option>",
        )
        .join("") +
      '</select></label><button class="btn primary">Create cohort →</button></form></div><p id="manage-status" role="status"></p>',
  );
  $("logout").onclick = async () => {
    try {
      await api("/instructor/logout", "POST", {});
      instructorAuth();
    } catch (e) {
      message("manage-status", e.message);
    }
  };
  $("create").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.submitter;
    b.disabled = true;
    try {
      const c = await api("/cohorts", "POST", {
        name: $("name").value.trim(),
        problem: $("assignment").value,
      });
      if (visit === state.visits)
        location.hash = "/cohort/" + encodeURIComponent(c.id);
    } catch (err) {
      message("manage-status", err.message);
    } finally {
      b.disabled = false;
    }
  };
}
async function cohort(id, visit) {
  const c = await api("/cohorts/" + encodeURIComponent(id));
  if (visit !== state.visits) return;
  const rows = c.attempts,
    attention = rows
      .filter((a) => a.band === "Shaky" || a.band === "Partial")
      .sort((a, b) => a.score - b.score);
  main.innerHTML = page(
    back("instructor", "All cohorts") +
      eyebrow("Cohort board") +
      '<h1 class="headline">' +
      esc(c.name) +
      '</h1><p class="lead">Assigned problem · ' +
      esc(c.problem) +
      '</p><div class="bar"><span class="file">Join code <strong>' +
      esc(c.joinCode) +
      '</strong></span><button class="btn" id="refresh">Refresh</button></div><h2 class="sectiontitle">Worth a conversation</h2><p class="note">Invite learners to explain a change they found difficult. Time is context for a conversation and carries no scoring penalty.</p>' +
      (attention.length
        ? attention
            .map(
              (a) =>
                '<div class="case">' +
                esc(a.displayName || "Anonymous learner") +
                " · " +
                esc(a.score) +
                " / " +
                esc(a.total) +
                "</div>",
            )
            .join("")
        : '<p class="copy">No completed rounds currently need a follow-up.</p>') +
      '<h2 class="sectiontitle">Learner results</h2>' +
      (rows.length
        ? '<div class="scroll"><table><thead><tr><th>Learner</th><th>Round</th><th>Score</th><th>Band</th></tr></thead><tbody>' +
          rows
            .map(
              (a) =>
                "<tr><td>" +
                esc(a.displayName || "Anonymous learner") +
                "</td><td>" +
                esc(a.status) +
                "</td><td>" +
                esc(a.score ?? "—") +
                " / " +
                esc(a.total) +
                "</td><td>" +
                esc(a.band || "—") +
                "</td></tr>",
            )
            .join("") +
          "</tbody></table></div>"
        : '<p class="copy">Share the join code with learners. Their attempts will appear here.</p>'),
  );
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
  const [view, slug] = path.split("/");
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
        home();
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
document.documentElement.dataset.theme =
  storage.get("theme") === "light" ? "light" : "dark";
document.querySelector(".theme").onclick = () => {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
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

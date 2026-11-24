import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { python } from "@codemirror/lang-python";
import { classHighlighter } from "@lezer/highlight";

export function attachEditor(host, text, onChange) {
  // In a shadow root, CodeMirror mounts its base rules through adoptedStyleSheets.
  // The colour scheme comes from a same-origin sheet under the site's strict CSP.
  const root = host.attachShadow({ mode: "open" });
  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = new URL("./editor-round.css", import.meta.url).href;
  root.append(sheet);
  const access = new Compartment();
  const view = new EditorView({
    root,
    parent: root,
    state: EditorState.create({
      doc: text,
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        python(), bracketMatching(), syntaxHighlighting(classHighlighter),
        indentUnit.of("    "), EditorState.tabSize.of(4), access.of([]),
        EditorView.contentAttributes.of({
          id: "editor", "aria-label": "Python solution", spellcheck: "false",
          autocapitalize: "off", autocomplete: "off",
        }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    }),
  });
  return {
    read: () => view.state.doc.toString(),
    lock(value) {
      view.dispatch({ effects: access.reconfigure([
        EditorState.readOnly.of(value), EditorView.editable.of(!value),
        EditorView.contentAttributes.of({ "aria-readonly": String(value) }),
      ]) });
    },
    destroy: () => view.destroy(),
  };
}

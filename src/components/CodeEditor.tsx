"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

export interface LineHighlight {
  startLine: number;
  endLine: number;
}

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("lunor", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7a7a7a", fontStyle: "italic" },
      { token: "keyword", foreground: "f87171" },
      { token: "string", foreground: "86efac" },
    ],
    colors: {
      "editor.background": "#0d0d0d",
      "editor.lineHighlightBackground": "#161616",
      "editorLineNumber.foreground": "#444444",
      "editorGutter.background": "#0d0d0d",
    },
  });
  // Generated apps are JSX in .js files — tell the TS worker so it doesn't flag JSX as errors.
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ jsx: monaco.languages.typescript.JsxEmit.React, allowJs: true, allowNonTsExtensions: true });
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
};

function languageOf(path: string): string {
  if (path.endsWith(".json")) return "json";
  if (/\.tsx?$/.test(path)) return "typescript";
  return "javascript";
}

export function CodeEditor({
  path,
  value,
  onChange,
  readOnly,
  highlight,
  onSelectionText,
  followTail,
}: {
  path: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  highlight?: LineHighlight | null;
  onSelectionText?: (text: string) => void;
  followTail?: boolean;
}) {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorations = useRef<string[]>([]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorSelection(() => {
      const sel = editor.getSelection();
      const model = editor.getModel();
      if (sel && model && onSelectionText) onSelectionText(model.getValueInRange(sel));
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const next = highlight
      ? [{
          range: new monaco.Range(highlight.startLine, 1, highlight.endLine, 1),
          options: { isWholeLine: true, className: "explain-line-highlight", linesDecorationsClassName: "explain-glyph" },
        }]
      : [];
    decorations.current = editor.deltaDecorations(decorations.current, next);
    if (highlight) editor.revealLinesInCenter(highlight.startLine, highlight.endLine);
  }, [highlight, path]);

  useEffect(() => {
    if (followTail && editorRef.current) editorRef.current.revealLine(value.split("\n").length);
  }, [value, followTail]);

  return (
    <Editor
      path={path}
      value={value}
      language={languageOf(path)}
      theme="lunor"
      beforeMount={defineTheme}
      onMount={onMount}
      onChange={(v) => onChange?.(v ?? "")}
      loading={<Loader2 className="size-5 animate-spin text-accent" />}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "var(--font-jetbrains), monospace",
        lineHeight: 20,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        padding: { top: 12 },
        renderLineHighlight: "line",
        automaticLayout: true,
      }}
    />
  );
}

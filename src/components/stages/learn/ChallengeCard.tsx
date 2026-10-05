"use client";

import { Award, FlaskConical, Lightbulb, Send, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { Button, Card, ErrorNote } from "@/components/ui";
import { postJson } from "@/lib/api-client";
import { useAsyncAction, type ProjectUpdater } from "@/lib/hooks";
import { recordChallenge, type Project } from "@/lib/project";
import type { ChallengeReview, Lesson } from "@/lib/schemas";

/** Hands-on practice: the learner edits a copy of their real file, the AI reviews it, and a passing edit can ship into the app. */
export function ChallengeCard({ lesson, project, update }: { lesson: Lesson; project: Project; update: ProjectUpdater }) {
  const path = lesson.fileRef.path;
  const original = project.files[path] ?? "";
  const [draft, setDraft] = useState(original);
  const [showHint, setShowHint] = useState(false);
  const [review, setReview] = useState<ChallengeReview | null>(null);
  const [applied, setApplied] = useState(false);
  const alreadyPassed = project.progress.challengesPassed.includes(lesson.id);

  const check = useAsyncAction(
    useCallback(
      async (signal: AbortSignal) => {
        const result = await postJson<ChallengeReview>("/api/check", { challenge: lesson.challenge, path, before: original, after: draft }, signal);
        setReview(result);
        if (result.passed) update((p) => ({ ...p, progress: recordChallenge(p.progress, lesson.id) }));
      },
      [lesson, path, original, draft, update],
    ),
  );

  const apply = () => {
    update((p) => ({ ...p, files: { ...p.files, [path]: draft } }));
    setApplied(true);
  };

  if (project.files[path] === undefined) return null;

  return (
    <Card className="p-6">
      <p className="flex items-center gap-2 font-semibold">
        <FlaskConical className="size-4 text-accent" /> Challenge: change your app
        {alreadyPassed && <Award className="size-4 text-warn" aria-label="Challenge passed" />}
      </p>
      <p className="mt-2 text-sm">{lesson.challenge.task}</p>
      <p className="mt-1 text-xs text-faint">Done when: {lesson.challenge.successCriteria}</p>
      <button onClick={() => setShowHint((v) => !v)} className="mt-2 flex items-center gap-1 text-xs text-warn hover:underline">
        <Lightbulb className="size-3.5" /> {showHint ? "Hide hint" : "Show hint"}
      </button>
      {showHint && <p className="mt-1 rounded-lg bg-warn-soft px-3 py-2 text-xs text-muted">{lesson.challenge.hint}</p>}

      <div className="mt-4 h-[340px] overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line bg-surface-2 px-3 py-1.5 font-mono text-xs text-muted">{path} · your copy</div>
        <div className="h-[calc(100%-29px)]">
          <CodeEditor path={`challenge/${lesson.id}/${path}`} value={draft} onChange={setDraft} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => check.run()} loading={check.loading} disabled={draft === original} icon={<Send className="size-4" />}>
          Submit for review
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setDraft(original); setReview(null); }}>Reset</Button>
        {draft === original && <span className="text-xs text-faint">Edit the code to submit.</span>}
      </div>

      {check.error && <div className="mt-3"><ErrorNote message={check.error} onRetry={() => check.run()} /></div>}
      {review && (
        <div className={`mt-3 rounded-xl border p-4 ${review.passed ? "border-ok/40 bg-ok-soft" : "border-warn/40 bg-warn-soft"}`}>
          <p className={`text-sm font-semibold ${review.passed ? "text-ok" : "text-warn"}`}>{review.passed ? "Challenge passed! +50 XP" : "Almost there"}</p>
          <p className="mt-1 text-sm text-muted">{review.feedback}</p>
          {review.passed && !applied && (
            <Button size="sm" className="mt-3" onClick={apply} icon={<Upload className="size-3.5" />}>Apply this change to my app</Button>
          )}
          {applied && <p className="mt-2 text-xs text-ok">Applied — open Build to see it in the preview.</p>}
        </div>
      )}
    </Card>
  );
}

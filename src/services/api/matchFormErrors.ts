import { AppError } from "./apiErrors";
import type { ApiErrorDetail } from "./apiTypes";

const TITLE = "Can't save match";

/** Map API / bean-validation fragments to readable labels. */
const TOKEN_LABELS: [RegExp, string][] = [
  [/p1Score/gi, "Player 1 score"],
  [/p2Score/gi, "Player 2 score"],
  [/setNumber/gi, "Set number"],
  [/Player\s*1\s*name/gi, "Player 1"],
  [/Player\s*2\s*name/gi, "Player 2"],
  [/status/gi, "Match status"],
];

function humanizeLine(line: string): string {
  let s = line.trim();
  for (const [re, label] of TOKEN_LABELS) {
    s = s.replace(re, label);
  }
  return s;
}

function splitBlobMessage(message: string): string[] {
  const s = humanizeLine(message.trim());
  if (!s) return [];

  const segments = s
    .split(/\s+(?=Player\s+[12]\b|Set number|Match status)/i)
    .map((x) => x.trim())
    .filter(Boolean);

  const lines = (segments.length ? segments : [s]).map((line) => (line.endsWith(".") ? line : `${line}.`));
  return lines;
}

function isFinishedMatchLockedMessage(message: string): boolean {
  return /finished matches cannot be modified/i.test(message);
}

function linesFromAppError(error: AppError): string[] {
  if (isFinishedMatchLockedMessage(error.message)) {
    return [
      "This finished match can't be updated with a status change.",
      "Save your score and note changes only, or try again within 48 hours of completion.",
    ];
  }

  if (error.errors?.length) {
    const out: string[] = [];
    for (const detail of error.errors) {
      const line = lineFromDetail(detail);
      if (line) out.push(line);
    }
    if (out.length) return out;
  }

  return splitBlobMessage(error.message);
}

function lineFromDetail(detail: ApiErrorDetail): string {
  const raw = detail.message?.trim();
  if (!raw) return "";
  let line = humanizeLine(raw);

  if (/must be/i.test(line) && /SCHEDULED|LIVE|FINISHED|IN_PROGRESS/.test(line)) {
    return "Pick a valid match status (live, scheduled, or finished).";
  }

  if (/scheduled matches should have empty sets/i.test(line)) {
    return "Scheduled matches can't include scores. Turn off Scheduled or clear the score section.";
  }

  return line.endsWith(".") ? line : `${line}.`;
}

/**
 * Turns API validation noise into a short title and bullet-style body for Alert dialogs.
 */
export function formatMatchSaveError(error: unknown): { title: string; body: string } {
  if (error instanceof AppError) {
    const lines = linesFromAppError(error);
    const body =
      lines.length > 1
        ? lines.map((l) => `• ${l}`).join("\n")
        : lines[0] ?? humanizeLine(error.message);

    return {
      title: TITLE,
      body,
    };
  }

  const msg =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";
  return {
    title: TITLE,
    body: humanizeLine(msg),
  };
}

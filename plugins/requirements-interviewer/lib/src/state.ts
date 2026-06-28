/**
 * Deterministic state store.
 *
 * Responsibilities (the deterministic half of the system):
 *   - load/save the structured state across requirements.json + decision-log.json
 *   - normalize patches proposed by the LLM (assign ids, sequences, timestamps)
 *   - apply patches by upsert/remove/set, never by freewriting prose
 *
 * The LLM proposes; this module validates the *shape* and persists.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  RequirementsState,
  Decision,
  SCHEMA_VERSION,
  Tier,
} from "./types.js";

export const REQUIREMENTS_FILE = "requirements.json";
export const DECISION_LOG_FILE = "decision-log.json";

function nowIso(): string {
  return new Date().toISOString();
}

function emptySection() {
  return { applicable: true, notes: [] as string[] };
}

export function newState(featureName: string, tier: Tier): RequirementsState {
  const ts = nowIso();
  return {
    schemaVersion: SCHEMA_VERSION,
    featureName,
    problemStatement: "",
    tier,
    goals: [],
    nonGoals: [],
    actors: [],
    userJourneys: [],
    functionalRequirements: [],
    nonFunctionalRequirements: [],
    constraints: [],
    assumptions: [],
    risks: [],
    openQuestions: [],
    acceptanceCriteria: [],
    outOfScope: [],
    dependencies: [],
    rollout: { ...emptySection(), phases: [] },
    observability: emptySection(),
    security: emptySection(),
    operational: emptySection(),
    riskReviews: [],
    handoffNotes: [],
    decisions: [],
    meta: { createdAt: ts, updatedAt: ts, decisionSequence: 0 },
  };
}

/** Collections that support id-keyed upsert/remove. */
const COLLECTIONS = [
  "goals",
  "nonGoals",
  "actors",
  "userJourneys",
  "functionalRequirements",
  "nonFunctionalRequirements",
  "constraints",
  "assumptions",
  "risks",
  "openQuestions",
  "acceptanceCriteria",
  "outOfScope",
  "dependencies",
  "decisions",
] as const;

type CollectionKey = (typeof COLLECTIONS)[number];

const ID_PREFIX: Record<CollectionKey, string> = {
  goals: "g",
  nonGoals: "ng",
  actors: "act",
  userJourneys: "uj",
  functionalRequirements: "fr",
  nonFunctionalRequirements: "nfr",
  constraints: "con",
  assumptions: "asm",
  risks: "risk",
  openQuestions: "q",
  acceptanceCriteria: "ac",
  outOfScope: "oos",
  dependencies: "dep",
  decisions: "dec",
};

const SCALAR_KEYS = ["featureName", "problemStatement", "tier"] as const;
const SECTION_KEYS = [
  "rollout",
  "observability",
  "security",
  "operational",
] as const;

export interface Patch {
  set?: Partial<Record<(typeof SCALAR_KEYS)[number], string>>;
  upsert?: Partial<Record<CollectionKey, any[]>>;
  remove?: Partial<Record<CollectionKey, string[]>>;
  sections?: Partial<Record<(typeof SECTION_KEYS)[number], any>>;
  riskReviews?: any[]; // appended
  handoffNotes?: string[]; // replaces the array when present
}

function nextId(existing: { id?: string }[], prefix: string): string {
  let max = 0;
  for (const item of existing) {
    const m = item.id && new RegExp(`^${prefix}-(\\d+)$`).exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${max + 1}`;
}

/**
 * Apply a structured patch. Returns a new state object. Pure aside from
 * generated ids/sequences/timestamps. Unknown keys are ignored so a slightly
 * malformed LLM patch degrades gracefully rather than corrupting state.
 */
export function applyPatch(
  state: RequirementsState,
  patch: Patch
): RequirementsState {
  const next: RequirementsState = structuredClone(state);

  if (patch.set) {
    for (const key of SCALAR_KEYS) {
      if (patch.set[key] !== undefined) (next as any)[key] = patch.set[key];
    }
  }

  if (patch.upsert) {
    for (const key of COLLECTIONS) {
      const incoming = patch.upsert[key];
      if (!incoming) continue;
      const list: any[] = (next as any)[key];
      for (const raw of incoming) {
        const item = { ...raw };
        if (!item.id) item.id = nextId(list, ID_PREFIX[key]);
        if (key === "decisions") normalizeDecisionInPlace(next, item);
        const idx = list.findIndex((x) => x.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item };
        else list.push(item);
      }
    }
  }

  if (patch.remove) {
    for (const key of COLLECTIONS) {
      const ids = patch.remove[key];
      if (!ids) continue;
      (next as any)[key] = (next as any)[key].filter(
        (x: any) => !ids.includes(x.id)
      );
    }
  }

  if (patch.sections) {
    for (const key of SECTION_KEYS) {
      const incoming = patch.sections[key];
      if (!incoming) continue;
      (next as any)[key] = { ...(next as any)[key], ...incoming };
      if ((next as any)[key].notes === undefined) (next as any)[key].notes = [];
    }
  }

  if (patch.riskReviews) {
    for (const r of patch.riskReviews) {
      next.riskReviews.push({ reviewedAt: nowIso(), ...r });
    }
  }

  if (patch.handoffNotes) next.handoffNotes = patch.handoffNotes.slice();

  next.meta.updatedAt = nowIso();
  return next;
}

/** Assign decision bookkeeping (sequence + timestamp) if not already set. */
function normalizeDecisionInPlace(
  state: RequirementsState,
  decision: Partial<Decision>
): void {
  const existing = state.decisions.find((d) => d.id === decision.id);
  if (decision.sequence === undefined) {
    decision.sequence = existing
      ? existing.sequence
      : ++state.meta.decisionSequence;
  } else {
    state.meta.decisionSequence = Math.max(
      state.meta.decisionSequence,
      decision.sequence
    );
  }
  if (!decision.timestamp) decision.timestamp = existing?.timestamp ?? nowIso();
  if (decision.alternatives === undefined)
    decision.alternatives = existing?.alternatives ?? [];
  if (decision.relatedRequirements === undefined)
    decision.relatedRequirements = existing?.relatedRequirements ?? [];
}

// ---------- persistence ----------

export function statePaths(dir: string) {
  return {
    requirements: join(dir, REQUIREMENTS_FILE),
    decisionLog: join(dir, DECISION_LOG_FILE),
  };
}

export function stateExists(dir: string): boolean {
  const p = statePaths(dir);
  return existsSync(p.requirements) && existsSync(p.decisionLog);
}

export function loadState(dir: string): RequirementsState {
  const p = statePaths(dir);
  if (!existsSync(p.requirements))
    throw new Error(`No ${REQUIREMENTS_FILE} in ${dir}. Run \`init\` first.`);
  const reqRaw = JSON.parse(readFileSync(p.requirements, "utf8"));
  const decisions = existsSync(p.decisionLog)
    ? JSON.parse(readFileSync(p.decisionLog, "utf8")).decisions ?? []
    : [];
  return { ...reqRaw, decisions };
}

export function saveState(dir: string, state: RequirementsState): void {
  const p = statePaths(dir);
  const { decisions, ...rest } = state;
  writeFileSync(p.requirements, JSON.stringify(rest, null, 2) + "\n");
  writeFileSync(
    p.decisionLog,
    JSON.stringify({ decisions }, null, 2) + "\n"
  );
}

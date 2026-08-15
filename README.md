# AILEXSI Regisseur

**Standalone Blueprint** — the creative decision layer.

Takes an `AnalysisSnapshot` (from `ailexsi-analyser`) + current Project state and produces a **Proposal** for a brand-new video track.

> Core rule: Proposal only. Never silent mutation. Human always decides.

---

## Status

| Item | Status |
|------|--------|
| Repository | Created |
| Proposal Schema | Defined |
| Heuristic Engine Spec | Defined |
| LLM Adapter Interface | Defined (optional later) |
| Implementation | Blueprint only — ready for Grok Build App |
| Integration | Via Proposal JSON |

**Current Version:** `0.1.0-blueprint`

---

## Purpose

The Regisseur is the "director".

It looks at:
- the song structure and energy (from Analyser)
- the available video material (clip inventory + motion/scene data)

and builds a coherent alternative edit on a **new video track**.

The original patchwork of imported clips stays completely intact.
You can compare, accept, reject or further edit the AI proposal.

---

## Architecture

```
ailexsi-regisseur/
├── src/
│   ├── types/
│   │   ├── proposal.ts          # ProjectEditProposal, operations, rationale
│   │   └── index.ts
│   ├── engines/
│   │   ├── heuristic.ts         # Rule-based first version (V0.1)
│   │   └── llm-adapter.ts       # Optional Local / API LLM later
│   ├── ranking.ts               # How clips are scored for sections
│   ├── cut-planner.ts           # Places cuts on beats / energy
│   ├── proposal-builder.ts      # Assembles the final Proposal
│   └── index.ts                 # Public API: createProposal()
├── docs/
│   └── SPEC.md
├── package.json
└── README.md
```

---

## Core Output: Proposal

```ts
interface ProjectEditProposal {
  id: string;
  createdAt: string;
  source: "heuristic" | "llm" | "hybrid";
  naturalLanguage?: string;          // optional user intent
  rationale: string;                 // human-readable explanation

  // The actual change
  operations: ProposalOperation[];

  // Preview helpers
  previewDiff: string;
  status: "pending" | "accepted" | "rejected";

  // Metadata
  basedOnSnapshotVersion: string;
  targetTrackName: string;           // e.g. "AI-Regie-V1"
}
```

### Main Operations (V0.1)

```ts
type ProposalOperation =
  | {
      op: "create_track";
      payload: {
        trackId: string;
        name: string;
        kind: "VIDEO";
      };
    }
  | {
      op: "place_clip";
      payload: {
        trackId: string;
        sourceClipId: string;        // from original inventory
        startMs: number;             // on the new track
        endMs: number;
        sourceInMs?: number;         // optional trim
        sourceOutMs?: number;
      };
    }
  | {
      op: "add_marker";
      payload: {
        timeMs: number;
        label: string;
        kind: "ai-cut" | "ai-section";
      };
    };
```

All operations are pure descriptions. The host Studio applies them only after Accept.

---

## Decision Logic (Heuristic V0.1)

1. **Section Detection**  
   Use audio segments (intro / build / drop / breakdown / outro) from the Snapshot.

2. **Clip Ranking per Section**  
   Score available video clips by:
   - Motion intensity match (high motion → drop sections)
   - Duration suitability
   - Scene variety
   - Avoid over-using the same clip too early

3. **Cut Placement**  
   Prefer beatGridMs and strong onsets.  
   Secondary: energy peaks and scene boundaries inside the source clip.

4. **Assembly**  
   Build a continuous timeline on the new track that covers the full song duration (or a user-selected range).

5. **Rationale Generation**  
   Always produce a short natural-language explanation of the major choices.

---

## Public API (Target)

```ts
import { createProposal } from "@ailexsi/regisseur";

const proposal = await createProposal({
  snapshot,                 // AnalysisSnapshot from Analyser
  project,                  // current project state (read-only)
  options?: {
    engine: "heuristic",    // later: "llm" | "hybrid"
    targetTrackName: "AI-Regie-V1",
    preferHighMotionOnDrops: true,
    maxClipReuse: 2,
  }
});

// proposal.status === "pending"
// Host shows rationale + preview → user Accept / Reject
```

---

## LLM Path (Future, same interface)

When a local model (Ollama) or API key (Grok / DeepSeek / Kimi / OpenAI) is available:

- Same input (Snapshot + Project)
- LLM receives a structured prompt + the Snapshot summary
- Must still output the exact `ProjectEditProposal` schema
- Heuristic can be used as fallback or as first draft for the LLM

The interface stays identical. Only the `source` field changes.

---

## Philosophy Guardrails

- Never write to the project directly
- Never overwrite existing tracks
- Always produce a new track (or clearly marked alternative)
- Always give a rationale
- Always leave the original material available for comparison

This keeps the system aligned with L.I.T.A. and the AILEXSI co-creation principle: **AI proposes, Human decides**.

---

## Related Repos

- `ailexsi-analyser` — produces the Snapshot this module consumes
- `ailexsi-decoder` — future high-quality media features
- `ailexsi-exporter` — renders the accepted timeline
- `ailexsi-resonance-studio` — host application that shows Accept/Reject UI

---

**Blueprint status: Ready for implementation.**

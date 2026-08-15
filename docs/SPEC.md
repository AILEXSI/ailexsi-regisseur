# AILEXSI Regisseur — Specification V0.1

## Goal

Transform an AnalysisSnapshot + current Project into a single, reviewable Proposal that creates one new video track with a musically coherent edit.

## Hard Constraints

1. Never mutate the existing project.
2. Always create a *new* track.
3. Every Proposal must contain a human-readable rationale.
4. Output must be pure data (JSON-serializable).

## Heuristic Engine (V0.1)

### Step 1 — Section Map
Use `snapshot.audio.segments`. Fallback: divide timeline into equal parts or energy-based rough sections.

### Step 2 — Clip Pool
All VIDEO clips from `snapshot.clips` + their `VideoClipAnalysis` (motion, scenes).

### Step 3 — Scoring
For each section, score every candidate clip:

```
score = 
  motionMatch * 0.4 +
  durationFit * 0.25 +
  sceneVariety * 0.2 +
  freshness * 0.15   // penalize recent reuse
```

### Step 4 — Cut Planning
- Prefer beats from `beatGridMs`
- Secondary: strong onsets and internal scene changes of the chosen source clip
- Avoid cuts closer than ~300 ms unless intentional stutter

### Step 5 — Assembly
Produce a sequence of `place_clip` operations that cover the desired range without gaps (or with intentional black if material is insufficient).

### Step 6 — Rationale
Generate 2–5 sentences explaining major choices ("High-motion clips placed on drop", "Longer establishing shot kept for intro", etc.).

## LLM Extension Point

Same function signature. When `engine: "llm"`:

- Build a compact prompt containing section summary + top-N scored clips
- Require the model to return valid `ProjectEditProposal` JSON
- Validate schema strictly; fall back to heuristic on failure

## Acceptance Flow (Host responsibility)

1. Show rationale + visual preview of the new track
2. User Accept → apply operations (create track + place clips)
3. User Reject → discard, optionally log decision to Vault

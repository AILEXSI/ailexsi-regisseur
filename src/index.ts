/**
 * AILEXSI Regisseur — Public API + Heuristic Skeleton
 * Version: 0.1.0-blueprint
 */

import type {
  ProjectEditProposal,
  ProposalOperation,
  CreateProposalOptions,
} from "./types";

// We accept the Snapshot shape from analyser (structural typing)
export interface AnalysisSnapshotLike {
  version: string;
  createdAt: string;
  projectId: string;
  durationMs: number;
  audio: {
    beatGridMs: number[];
    energyCurve: Array<{ timeMs: number; rms: number; loudness: number }>;
    segments: Array<{
      startMs: number;
      endMs: number;
      label: string;
      confidence: number;
    }>;
  };
  video: {
    clips: Array<{
      clipId: string;
      trackId: string;
      startMs: number;
      endMs: number;
      durationMs: number;
      motionScore: number;
      sceneChangesMs: number[];
    }>;
  };
  clips: Array<{
    clipId: string;
    trackId: string;
    trackKind: "VIDEO" | "AUDIO";
    startMs: number;
    endMs: number;
    durationMs: number;
    label?: string;
  }>;
  beatGridMs: number[];
}

export interface MinimalProjectForRegisseur {
  id: string;
  durationMs: number;
}

function uid(): string {
  return crypto.randomUUID();
}

/**
 * Very simple heuristic V0.1:
 * - Create one new video track
 * - Place available video clips in order of appearance, aligned roughly to beats when possible
 * - Add section markers from the snapshot if present
 */
function buildHeuristicProposal(
  snapshot: AnalysisSnapshotLike,
  options: CreateProposalOptions = {}
): ProjectEditProposal {
  const trackId = uid();
  const trackName = options.targetTrackName ?? "AI-Regie-V1";
  const operations: ProposalOperation[] = [];

  // 1. Create the new track
  operations.push({
    op: "create_track",
    payload: {
      trackId,
      name: trackName,
      kind: "VIDEO",
    },
  });

  // 2. Collect video clips from inventory
  const videoClips = snapshot.clips.filter((c) => c.trackKind === "VIDEO");

  // Simple placement: sequential, starting at 0, respecting original durations
  let cursor = 0;
  const placed: string[] = [];

  for (const clip of videoClips) {
    if (cursor >= snapshot.durationMs) break;

    const duration = Math.min(clip.durationMs, snapshot.durationMs - cursor);
    if (duration <= 0) continue;

    operations.push({
      op: "place_clip",
      payload: {
        trackId,
        sourceClipId: clip.clipId,
        startMs: cursor,
        endMs: cursor + duration,
        label: clip.label,
      },
    });

    placed.push(clip.clipId);
    cursor += duration;

    // Optional: snap next start to nearest beat if available
    if (snapshot.beatGridMs.length > 0) {
      const nextBeat = snapshot.beatGridMs.find((b) => b >= cursor);
      if (nextBeat != null && nextBeat - cursor < 400) {
        cursor = nextBeat;
      }
    }
  }

  // 3. Add section markers from audio segments
  for (const seg of snapshot.audio.segments) {
    operations.push({
      op: "add_marker",
      payload: {
        timeMs: seg.startMs,
        label: `AI: ${seg.label}`,
        kind: "ai-section",
      },
    });
  }

  const rationaleParts: string[] = [];
  rationaleParts.push(
    `Neue Spur "${trackName}" angelegt.`
  );
  rationaleParts.push(
    `${placed.length} Video-Clips sequentiell platziert.`
  );
  if (snapshot.beatGridMs.length > 0) {
    rationaleParts.push(
      `Cut-Starts teilweise an Beat-Grid ausgerichtet (${snapshot.beatGridMs.length} Beats bekannt).`
    );
  } else {
    rationaleParts.push(
      `Noch kein Beat-Grid vorhanden — Platzierung rein sequentiell. Analyser-Upgrade verbessert das Ergebnis.`
    );
  }
  if (snapshot.audio.segments.length > 0) {
    rationaleParts.push(
      `${snapshot.audio.segments.length} Struktur-Marker aus der Audio-Analyse übernommen.`
    );
  }

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    source: "heuristic",
    rationale: rationaleParts.join(" "),
    operations,
    previewDiff: `+ Track "${trackName}" · ${placed.length} clips`,
    status: "pending",
    basedOnSnapshotVersion: snapshot.version,
    targetTrackName: trackName,
  };
}

/**
 * Main entry point.
 */
export async function createProposal(input: {
  snapshot: AnalysisSnapshotLike;
  project?: MinimalProjectForRegisseur;
  options?: CreateProposalOptions;
}): Promise<ProjectEditProposal> {
  const engine = input.options?.engine ?? "heuristic";

  if (engine === "heuristic" || engine === "hybrid") {
    return buildHeuristicProposal(input.snapshot, input.options);
  }

  // LLM path placeholder — same interface, not implemented yet
  const fallback = buildHeuristicProposal(input.snapshot, input.options);
  return {
    ...fallback,
    source: "heuristic",
    rationale:
      fallback.rationale +
      " (LLM-Engine noch nicht angebunden — Heuristik verwendet)",
  };
}

export * from "./types";

/**
 * AILEXSI Regisseur — Proposal Types
 * Version: 0.1.0-blueprint
 */

export type ProposalSource = "heuristic" | "llm" | "hybrid";
export type ProposalStatus = "pending" | "accepted" | "rejected";

export type ProposalOperation =
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
        sourceClipId: string;
        startMs: number;
        endMs: number;
        sourceInMs?: number;
        sourceOutMs?: number;
        label?: string;
      };
    }
  | {
      op: "add_marker";
      payload: {
        timeMs: number;
        label: string;
        kind: "ai-cut" | "ai-section" | "ai-note";
      };
    }
  | {
      op: "set_playhead";
      payload: {
        playheadMs: number;
      };
    };

export interface ProjectEditProposal {
  id: string;
  createdAt: string; // ISO
  source: ProposalSource;
  naturalLanguage?: string;
  rationale: string;

  operations: ProposalOperation[];

  previewDiff: string;
  status: ProposalStatus;

  basedOnSnapshotVersion: string;
  targetTrackName: string;
}

export interface CreateProposalOptions {
  engine?: "heuristic" | "llm" | "hybrid";
  targetTrackName?: string;
  preferHighMotionOnDrops?: boolean;
  maxClipReuse?: number;
  naturalLanguage?: string;
}

export type IdentityMode = "anonymous-collector-instance" | "warmhub-account" | "hybrid";

export interface DraftSubmission {
  title: string;
  notes: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  userWref?: string;
}

export interface SubmissionEnvelope {
  schemaVersion: "warmhub.collector.submission.v1";
  idempotencyKey: string;
  identity: {
    mode: IdentityMode;
    subjectWref: string;
    collectorInstanceWref: string;
  };
  capturedAt: string;
  repo: string;
  payload: DraftSubmission;
  provenance: {
    appVersion: string;
    location?: {
      lat: number;
      lng: number;
      accuracy?: number;
    };
  };
  qc: {
    clientChecks: string[];
  };
}

const collectorKey = "warmhub.collector.instance";
const queueKey = "warmhub.collector.queue";

export function getCollectorInstanceWref(): string {
  const existing = localStorage.getItem(collectorKey);
  if (existing) return existing;
  const id = crypto.randomUUID();
  const wref = `CollectorInstance/${id}`;
  localStorage.setItem(collectorKey, wref);
  return wref;
}

export function buildEnvelope(mode: IdentityMode, draft: DraftSubmission): SubmissionEnvelope {
  const collectorInstanceWref = getCollectorInstanceWref();
  const userWref = draft.userWref?.trim();
  const subjectWref =
    mode === "warmhub-account" && userWref ? userWref : collectorInstanceWref;
  const clientChecks = ["required:title"];

  if (draft.latitude !== undefined && draft.longitude !== undefined) {
    clientChecks.push("location:present");
  }

  return {
    schemaVersion: "warmhub.collector.submission.v1",
    idempotencyKey: crypto.randomUUID(),
    identity: {
      mode,
      subjectWref,
      collectorInstanceWref,
    },
    capturedAt: new Date().toISOString(),
    repo: import.meta.env.VITE_WARMHUB_REPO ?? "",
    payload: draft,
    provenance: {
      appVersion: import.meta.env.VITE_APP_VERSION ?? "0.1.0",
      location:
        draft.latitude !== undefined && draft.longitude !== undefined
          ? {
              lat: draft.latitude,
              lng: draft.longitude,
              accuracy: draft.accuracy,
            }
          : undefined,
    },
    qc: { clientChecks },
  };
}

export function readQueue(): SubmissionEnvelope[] {
  const raw = localStorage.getItem(queueKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SubmissionEnvelope[];
  } catch {
    return [];
  }
}

export function queueSubmission(envelope: SubmissionEnvelope): SubmissionEnvelope[] {
  const next = [...readQueue(), envelope];
  localStorage.setItem(queueKey, JSON.stringify(next));
  return next;
}

export async function flushQueue(): Promise<{ sent: number; remaining: SubmissionEnvelope[] }> {
  const handlerUrl = import.meta.env.VITE_COLLECTOR_HANDLER_URL;
  if (!handlerUrl) throw new Error("VITE_COLLECTOR_HANDLER_URL is required");

  const pending = readQueue();
  const remaining: SubmissionEnvelope[] = [];
  let sent = 0;

  for (const envelope of pending) {
    try {
      const response = await fetch(handlerUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(envelope),
      });
      if (!response.ok) throw new Error(`handler returned ${response.status}`);
      sent += 1;
    } catch {
      remaining.push(envelope);
    }
  }

  const pendingIds = new Set(pending.map((envelope) => envelope.idempotencyKey));
  const queuedWhileFlushing = readQueue().filter(
    (envelope) => !pendingIds.has(envelope.idempotencyKey),
  );
  const nextQueue = [...remaining, ...queuedWhileFlushing];
  localStorage.setItem(queueKey, JSON.stringify(nextQueue));
  return { sent, remaining: nextQueue };
}

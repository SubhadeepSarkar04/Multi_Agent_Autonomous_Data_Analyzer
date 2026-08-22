import { RunDetail, RunSummary } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function startRun(
  file: File,
  targetColumn: string,
  problemType: string
): Promise<{ run_id: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_column", targetColumn.trim());
  formData.append("problem_type", problemType);

  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to start run" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }

  return res.json();
}

export async function getRuns(): Promise<RunSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/runs`, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch runs:", err);
    return [];
  }
}

export async function getRunStatus(runId: string): Promise<RunDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/runs/${runId}/status`, { cache: "no-store" });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch status for run ${runId}:`, err);
    return null;
  }
}

export function getArtifactUrl(runId: string, filename: string): string {
  // filename could be full path or just basename
  const cleanName = filename.split(/[\\/]/).pop() || filename;
  return `${API_BASE}/runs/${runId}/artifacts/${cleanName}`;
}

export function getModelDownloadUrl(runId: string): string {
  return `${API_BASE}/runs/${runId}/model`;
}

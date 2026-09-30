import { RunDetail, RunSummary } from "./types";

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

export const API_BASE = getApiBase();

export async function startRun(
  file: File,
  targetColumn: string,
  problemType: string
): Promise<{ run_id: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_column", targetColumn.trim());
  formData.append("problem_type", problemType);

  const base = getApiBase();
  const res = await fetch(`${base}/run`, {
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
    const base = getApiBase();
    const res = await fetch(`${base}/runs`, { cache: "no-store" });
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
    const base = getApiBase();
    const res = await fetch(`${base}/runs/${runId}/status`, { cache: "no-store" });
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
  const cleanName = filename.split(/[\\/]/).pop() || filename;
  const base = getApiBase();
  return `${base}/runs/${runId}/artifacts/${cleanName}`;
}

export function getModelDownloadUrl(runId: string): string {
  const base = getApiBase();
  return `${base}/runs/${runId}/model`;
}

export async function pauseRun(runId: string): Promise<{ run_id: string; status: string; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/runs/${runId}/pause`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to pause run" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function resumeRun(runId: string): Promise<{ run_id: string; status: string; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/runs/${runId}/resume`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to resume run" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function rerunPipeline(runId: string): Promise<{ run_id: string; status: string; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/runs/${runId}/rerun`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to rerun pipeline" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function stopRun(runId: string): Promise<{ run_id: string; status: string; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/runs/${runId}/stop`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to stop run" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function executeCustomCode(
  runId: string,
  code: string,
  agentName?: string
): Promise<{ ok: boolean; stdout?: string; traceback?: string; updated_state?: any; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/runs/${runId}/execute_code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, agent_name: agentName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to execute code" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function deleteRun(runId: string): Promise<{ ok: boolean; run_id: string; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/runs/${runId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete run" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function deleteAllRuns(): Promise<{ ok: boolean; count: number; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/runs`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to clear all runs" }));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

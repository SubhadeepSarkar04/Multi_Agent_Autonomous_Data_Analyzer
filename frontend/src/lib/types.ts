export type ProblemType = "classification" | "regression";
export type RunStatus = "pending" | "running" | "paused" | "done" | "failed" | "cancelled";

export type AgentNode = "loader_eda" | "feature_engineer" | "tuner" | "explainer";

export interface RunSummary {
  run_id: string;
  created_at: string;
  csv_filename: string;
  target_column: string;
  problem_type: ProblemType;
  status: RunStatus;
  last_agent?: AgentNode | string;
  retry_count: number;
}

export interface RunDetail extends RunSummary {
  metrics?: {
    baseline?: Record<string, number | string>;
    tuned?: Record<string, number | string>;
    best_params?: Record<string, any>;
    best_parameters?: Record<string, any>;
    [key: string]: any;
  };
  cleaned_csv_path?: string | null;
  eda_plot_paths?: string[] | null;
  shap_plot_path?: string | null;
  model_path?: string | null;
  error_traceback?: string | null;
  code_history?: string[] | null;
}


"""
graph.py

LangGraph assembly for the AutoML multi-agent pipeline.

Wires the four agent nodes defined in agents.py into a StateGraph with a
shared conditional-edge function (`check_execution_status`) that governs
retries and failure routing. The graph's structure guarantees that no
node can be revisited more than MAX_RETRIES times: once a node's
retry_count reaches MAX_RETRIES, check_execution_status routes to
"system_failure_sink", a terminal node with no edge back into the
pipeline -- only an edge to END.

Pipeline order: loader -> feature_engineer -> tuner -> explainer -> END.
"""

from __future__ import annotations

from typing import Any, Dict

from langgraph.graph import StateGraph, END

from state_schema import DataScientistState, MAX_RETRIES
from agents import (
    loader_eda_node,
    feature_engineer_node,
    tuner_node,
    explainer_node,
)


# ---------------------------------------------------------------------------
# Terminal failure node
# ---------------------------------------------------------------------------

def system_failure_sink(state: DataScientistState) -> Dict[str, Any]:
    """
    Terminal node reached when a stage exhausts its retry budget.

    Returns the state unchanged -- this node performs no execution and
    no cleanup. It exists purely as a single, shared landing point so
    that every stage's failure path converges on one place, from which
    the final state (including error_traceback, code_history, and
    last_agent) can be logged or reported by the caller. There is no
    edge from this node back into the pipeline, only to END, so
    reaching it always terminates the run.
    """
    return state


# ---------------------------------------------------------------------------
# Shared conditional-edge routing function
# ---------------------------------------------------------------------------

def check_execution_status(state: DataScientistState) -> str:
    """
    Shared conditional-edge function attached after every agent node.

    Returns one of three routing keys:
      - "next_stage": the node succeeded (error_traceback is None).
            Proceed to whatever the next stage is for this node.
      - "retry": the node failed but retry_count is still below
            MAX_RETRIES. Loop back to the SAME node so it can attempt
            self-correction using the error_traceback now in state.
      - "system_failure_sink": the node failed and retry_count has
            reached MAX_RETRIES. Route to the terminal failure node;
            there is no edge from there back into the pipeline, so this
            guarantees the graph cannot loop on a single node forever.

    Args:
        state: Current pipeline state, as returned by the node that was
            just executed (agents.run_agent_node sets error_traceback
            and retry_count on every invocation, success or failure).

    Returns:
        One of "next_stage", "retry", "system_failure_sink".
    """
    if state.get("error_traceback") is not None:
        if state["retry_count"] < MAX_RETRIES:
            return "retry"
        return "system_failure_sink"
    return "next_stage"


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

workflow = StateGraph(DataScientistState)

workflow.add_node("loader", loader_eda_node)
workflow.add_node("feature_engineer", feature_engineer_node)
workflow.add_node("tuner", tuner_node)
workflow.add_node("explainer", explainer_node)
workflow.add_node("system_failure_sink", system_failure_sink)

workflow.set_entry_point("loader")

# One add_conditional_edges call per stage node. Only the "next_stage"
# destination differs between stages; "retry" always loops back to the
# same node, and "system_failure_sink" always routes to the shared
# terminal node.
workflow.add_conditional_edges(
    "loader",
    check_execution_status,
    {
        "next_stage": "feature_engineer",
        "retry": "loader",
        "system_failure_sink": "system_failure_sink",
    },
)

workflow.add_conditional_edges(
    "feature_engineer",
    check_execution_status,
    {
        "next_stage": "tuner",
        "retry": "feature_engineer",
        "system_failure_sink": "system_failure_sink",
    },
)

workflow.add_conditional_edges(
    "tuner",
    check_execution_status,
    {
        "next_stage": "explainer",
        "retry": "tuner",
        "system_failure_sink": "system_failure_sink",
    },
)

workflow.add_conditional_edges(
    "explainer",
    check_execution_status,
    {
        "next_stage": END,
        "retry": "explainer",
        "system_failure_sink": "system_failure_sink",
    },
)

# system_failure_sink is terminal: no edge back into the pipeline, only
# to END. This is what makes MAX_RETRIES a hard, structural ceiling
# rather than a convention that relies on every node behaving.
workflow.add_edge("system_failure_sink", END)

app = workflow.compile()
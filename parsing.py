import re
import textwrap
from typing import Tuple


def parse_agent_response(response_text: str) -> Tuple[str, str]:
    """
    Extract thought and executable python code from an agent LLM response.
    
    Robustly handles various LLM formatting patterns:
      - ```python ... ```, ```py ... ```, or ``` ... ``` (picks substantive block)
      - <code>...</code> XML tags with or without markdown
      - Unclosed markdown code fences if response ends early
      - Raw python code if LLM skipped markdown fences
      - Dedents extracted code to prevent IndentationError
    """
    text = response_text.strip()
    if not text:
        raise ValueError("LLM returned an empty response.")

    # 1. Extract thought from <thought> or <think> tags if present
    thought = ""
    thought_match = re.search(
        r"<(?:thought|think)>(.*?)</(?:thought|think)>",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if thought_match:
        thought = thought_match.group(1).strip()
        text_without_thought = text[:thought_match.start()] + text[thought_match.end():]
    else:
        text_without_thought = text

    code = ""

    # Strategy 1: Find all markdown code fences ```python ... ``` or ``` ... ```
    fences = list(
        re.finditer(
            r"```(?:python|py)?\s*\n?(.*?)\s*```",
            text_without_thought,
            re.DOTALL | re.IGNORECASE,
        )
    )
    if fences:
        best_fence = max(fences, key=lambda m: len(m.group(1).strip()))
        if best_fence.group(1).strip():
            code = best_fence.group(1).strip()

    # Strategy 2: Code inside <code>...</code> tags
    if not code:
        code_tags = list(
            re.finditer(
                r"<code>\s*\n?(.*?)\s*</code>",
                text_without_thought,
                re.DOTALL | re.IGNORECASE,
            )
        )
        if code_tags:
            best_tag = max(code_tags, key=lambda m: len(m.group(1).strip()))
            inner = best_tag.group(1).strip()
            inner_fence = re.search(
                r"```(?:python|py)?\s*\n?(.*?)\s*```",
                inner,
                re.DOTALL | re.IGNORECASE,
            )
            if inner_fence and inner_fence.group(1).strip():
                code = inner_fence.group(1).strip()
            elif inner:
                code = inner

    # Strategy 3: Unclosed code fence (```python ... to end of text)
    if not code:
        unclosed = re.search(
            r"```(?:python|py)?\s*\n?(.*)$",
            text_without_thought,
            re.DOTALL | re.IGNORECASE,
        )
        if unclosed and unclosed.group(1).strip():
            code = unclosed.group(1).strip()

    # Strategy 4: Raw python code starting at first code keyword
    if not code:
        lines = text_without_thought.splitlines()
        code_start_idx = None
        for i, line in enumerate(lines):
            l = line.strip()
            if any(
                l.startswith(kw)
                for kw in [
                    "import ",
                    "from ",
                    "state_updates",
                    "def ",
                    "df =",
                    "model =",
                    "plt.",
                    "shap.",
                    "joblib.",
                    "pd.",
                    "np.",
                ]
            ):
                code_start_idx = i
                break
        if code_start_idx is not None:
            code = "\n".join(lines[code_start_idx:])

    if not code:
        raise ValueError("LLM failed to output executable code.")

    # Clean residual fences and dedent
    code = textwrap.dedent(code).strip()
    if code.startswith("```python") or code.startswith("```py") or code.startswith("```"):
        code = re.sub(r"^```(?:python|py)?\s*", "", code, flags=re.IGNORECASE)
    if code.endswith("```"):
        code = re.sub(r"\s*```$", "", code)
    if code.startswith("<code>") and code.endswith("</code>"):
        code = code[6:-7].strip()

    code = textwrap.dedent(code).strip()
    if not thought and fences:
        thought = text[:fences[0].start()].strip()

    return thought, code

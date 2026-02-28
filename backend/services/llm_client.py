"""
LLM Client — Isolated OpenAI integration for report generation.
Never imports or touches scoring logic.
"""
import os
import logging
import time
from typing import Optional

logger = logging.getLogger("llm_client")


def _get_config() -> dict:
    return {
        "api_key": os.getenv("OPENAI_API_KEY", ""),
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "max_tokens": int(os.getenv("LLM_MAX_TOKENS", "1200")),
        "timeout": int(os.getenv("LLM_TIMEOUT_SECONDS", "15")),
    }


def generate_report_text(system_prompt: str, user_prompt: str) -> Optional[dict]:
    """
    Call OpenAI Chat Completions API.
    Returns dict with keys: text, model, prompt_tokens, completion_tokens, total_tokens.
    Returns None on any failure.
    """
    config = _get_config()

    if not config["api_key"]:
        logger.error("OPENAI_API_KEY is not set. Report generation unavailable.")
        return None

    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=config["api_key"],
            timeout=config["timeout"],
        )

        start = time.time()
        response = client.chat.completions.create(
            model=config["model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=config["max_tokens"],
            temperature=0.2,
            stream=False,
        )
        elapsed_ms = int((time.time() - start) * 1000)

        choice = response.choices[0]
        usage = response.usage

        result = {
            "text": choice.message.content or "",
            "model": response.model,
            "prompt_tokens": usage.prompt_tokens if usage else 0,
            "completion_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0,
            "generation_time_ms": elapsed_ms,
        }

        logger.info(
            "LLM call completed",
            extra={
                "model": result["model"],
                "total_tokens": result["total_tokens"],
                "generation_time_ms": elapsed_ms,
            },
        )

        return result

    except ImportError:
        logger.error("openai package is not installed. Run: pip install openai")
        return None
    except Exception as exc:
        logger.error("LLM API call failed: %s — %s", type(exc).__name__, str(exc)[:200])
        return None

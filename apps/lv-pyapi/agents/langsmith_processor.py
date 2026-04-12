"""
LangSmith span processor for LiveKit Agents.

Enriches OpenTelemetry spans from LiveKit Agents with LangSmith-compatible
attributes for conversation tracking and visualization.

Based on: https://github.com/langchain-ai/voice-agents-tracing
"""

from __future__ import annotations

import json
import logging
from copy import deepcopy
from typing import Dict, List, Optional, Tuple

from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import ReadableSpan, SpanProcessor
from opentelemetry.sdk.trace.export import BatchSpanProcessor


logger = logging.getLogger("langsmith-processor")


class LangSmithSpanProcessor(SpanProcessor):
    """
    Enrich LiveKit Agents OpenTelemetry spans with LangSmith-compatible
    attributes so that STT → LLM → TTS pipeline steps appear as structured
    traces in the LangSmith UI.
    """

    def __init__(self, downstream_processor: Optional[SpanProcessor] = None) -> None:
        super().__init__()
        if downstream_processor is None:
            downstream_processor = BatchSpanProcessor(OTLPSpanExporter())
        self.downstream = downstream_processor

        # Per-trace conversation state
        self.conversation_messages: Dict[str, List[dict]] = {}
        self.trace_to_conversation_id: Dict[str, str] = {}
        self.deferred_job_spans: Dict[str, ReadableSpan] = {}

    # -------------------------------------------------------------------------
    # SpanProcessor interface
    # -------------------------------------------------------------------------

    def on_start(self, span: ReadableSpan, parent_context = None) -> None:  # type: ignore[override]
        if self.downstream:
            self.downstream.on_start(span, parent_context)

    def on_end(self, span: ReadableSpan) -> None:  # type: ignore[override]
        trace_id = format(span.context.trace_id, "032x")
        span._attributes["langsmith.metadata.thread_id"] = trace_id

        if trace_id in self.trace_to_conversation_id:
            cid = self.trace_to_conversation_id[trace_id]
            span._attributes["conversation.id"] = cid

        span_name = span.name.lower()

        # ---- STT spans ------------------------------------------------------
        if "stt" in span_name or "transcription" in span_name or "speech_to_text" in span_name:
            span._attributes["langsmith.span.kind"] = "llm"
            transcript = (
                span.attributes.get("transcript")
                or span.attributes.get("text")
                or span.attributes.get("output", "")
            )
            self._set_prompt(span, [{"role": "user", "content": "audio_segment"}])
            if transcript:
                self._set_completion(
                    span,
                    [{"role": "assistant", "content": str(transcript)}],
                )

        # ---- LLM spans ------------------------------------------------------
        elif (
            "llm" in span_name
            or "chat" in span_name
            or "completion" in span_name
            or "openai" in span_name
        ):
            span._attributes["langsmith.span.kind"] = "llm"

            messages = self._extract_llm_messages(span)
            if not messages:
                messages = self._fallback_messages(span, span_name)
            self._set_prompt(span, messages)

            output = self._extract_llm_output(span)
            if output:
                self._set_completion(
                    span,
                    [{"role": "assistant", "content": str(output)}],
                )
                self._track_messages(trace_id, messages, str(output))

        # ---- TTS spans ------------------------------------------------------
        elif "tts" in span_name or "text_to_speech" in span_name or "synthesis" in span_name:
            span._attributes["langsmith.span.kind"] = "llm"
            text = (
                span.attributes.get("lk.input_text")
                or span.attributes.get("lk.request.text")
                or span.attributes.get("lk.text")
                or span.attributes.get("text")
                or ""
            )
            voice_id = (
                span.attributes.get("lk.voice")
                or span.attributes.get("voice")
                or span.attributes.get("voice_id")
                or "unknown"
            )
            self._set_prompt(
                span,
                [
                    {"role": "system", "content": f"Convert to speech with voice: {voice_id}"},
                    {"role": "user", "content": str(text) if text else "text_to_speech"},
                ],
            )
            self._set_completion(
                span,
                [{"role": "assistant", "content": f"Generated audio for: {text}"}],
            )

        # ---- Function tool spans (LiveKit @function_tool) -----------------
        elif "function_tool" in span_name or span.attributes.get("lk.function_tool.name"):
            span._attributes["langsmith.span.kind"] = "tool"
            tool_name = str(
                span.attributes.get("lk.function_tool.name")
                or span.attributes.get("tool.name")
                or "unknown_tool"
            )
            call_id = span.attributes.get("lk.function_tool.id")
            raw_args = span.attributes.get("lk.function_tool.arguments")
            args_text = self._stringify_trace_value(raw_args) or "(none)"
            output_raw = span.attributes.get("lk.function_tool.output")
            output_text = self._stringify_trace_value(output_raw)
            if not output_text:
                output_text = "(no output recorded)"
            is_error = span.attributes.get("lk.function_tool.is_error")
            lines = [f"name: {tool_name}"]
            if call_id:
                lines.append(f"call_id: {call_id}")
            if is_error is not None:
                lines.append(f"is_error: {is_error}")
            lines.append("")
            lines.append("parameters:")
            lines.append(args_text)
            self._set_prompt(span, [{"role": "user", "content": "\n".join(lines)}])
            self._set_completion(span, [{"role": "assistant", "content": output_text}])

        # ---- Agent / session / job spans -----------------------------------
        elif any(k in span_name for k in ("agent", "session", "conversation", "job")):
            span._attributes["langsmith.span.kind"] = "chain"
            is_job = "job" in span_name

            cid = (
                span.attributes.get("conversation.id")
                or span.attributes.get("conversation_id")
                or span.attributes.get("session_id")
                or (span.attributes.get("lk.job_id") if is_job else "")
                or ""
            )
            if cid:
                self.trace_to_conversation_id[trace_id] = str(cid)
                span._attributes["conversation.id"] = str(cid)
                span._attributes["langsmith.root_span"] = True
            elif is_job:
                span._attributes["conversation.id"] = trace_id
                span._attributes["langsmith.root_span"] = True

            conv_msgs = self.conversation_messages.get(trace_id, [])
            if conv_msgs:
                _, first_user, remaining = self._split_messages(conv_msgs)
                prompt_msgs = [first_user] if first_user else []
                if prompt_msgs:
                    self._set_prompt(span, prompt_msgs)
                if remaining:
                    self._set_completion(span, remaining)
                self._release_job_span(trace_id, prompt_msgs, remaining)
            elif is_job:
                # Defer export until we have some conversation data
                self.deferred_job_spans[trace_id] = span
                return

            if is_job or span.parent is None:
                self.conversation_messages.pop(trace_id, None)
                self.trace_to_conversation_id.pop(trace_id, None)

        # ---- Everything else -----------------------------------------------
        else:
            span._attributes["langsmith.span.kind"] = "chain"

        self._export(span)

    def shutdown(self) -> None:  # type: ignore[override]
        for trace_id, span in list(self.deferred_job_spans.items()):
            self._export(span)
            del self.deferred_job_spans[trace_id]
        if self.downstream:
            self.downstream.shutdown()

    def force_flush(self, timeout_millis: int = 30000) -> bool:  # type: ignore[override]
        for trace_id, span in list(self.deferred_job_spans.items()):
            self._export(span)
            del self.deferred_job_spans[trace_id]
        if self.downstream:
            return self.downstream.force_flush(timeout_millis)
        return True

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _stringify_trace_value(self, val: object) -> str:
        """Format tool args/output for LangSmith gen_ai.* attributes."""
        if val is None:
            return ""
        if isinstance(val, str):
            s = val.strip()
            if not s:
                return ""
            # Pretty-print JSON object/array strings when possible
            if (s.startswith("{") and s.endswith("}")) or (s.startswith("[") and s.endswith("]")):
                try:
                    parsed = json.loads(s)
                    return json.dumps(parsed, ensure_ascii=False, indent=2)
                except (json.JSONDecodeError, TypeError):
                    pass
            return val
        try:
            return json.dumps(val, ensure_ascii=False, indent=2, default=str)
        except TypeError:
            return str(val)

    def _set_prompt(self, span: ReadableSpan, messages: List[dict], start: int = 0) -> None:
        for i, msg in enumerate(messages):
            idx = start + i
            span._attributes[f"gen_ai.prompt.{idx}.role"] = msg.get("role", "user")
            span._attributes[f"gen_ai.prompt.{idx}.content"] = str(msg.get("content", ""))

    def _set_completion(self, span: ReadableSpan, messages: List[dict], start: int = 0) -> None:
        for i, msg in enumerate(messages):
            idx = start + i
            span._attributes[f"gen_ai.completion.{idx}.role"] = msg.get("role", "assistant")
            span._attributes[f"gen_ai.completion.{idx}.content"] = str(msg.get("content", ""))

    def _extract_llm_messages(self, span: ReadableSpan) -> List[dict]:
        # Strategy 1: LiveKit-specific chat context
        chat_ctx = span.attributes.get("lk.chat_ctx")
        if chat_ctx:
            try:
                data = json.loads(chat_ctx) if isinstance(chat_ctx, str) else chat_ctx
                if isinstance(data, dict) and "items" in data:
                    messages: List[dict] = []
                    for item in data["items"]:
                        if isinstance(item, dict) and item.get("type") == "message":
                            role = item.get("role", "user")
                            content = item.get("content", "")
                            if isinstance(content, list):
                                content = " ".join(str(c) for c in content)
                            if content:
                                messages.append(
                                    {
                                        "role": str(role),
                                        "content": str(content),
                                    }
                                )
                    if messages:
                        return messages
            except (json.JSONDecodeError, TypeError, KeyError):
                pass

        # Strategy 2: gen_ai.request.prompt.* or gen_ai.prompt.*
        for prefix in ("gen_ai.request.prompt", "gen_ai.prompt"):
            messages = []
            idx = 0
            while True:
                role_key = f"{prefix}.{idx}.role"
                content_key = f"{prefix}.{idx}.content"
                if role_key in span.attributes or content_key in span.attributes:
                    role = span.attributes.get(role_key, "user")
                    content = span.attributes.get(content_key, "")
                    if content:
                        messages.append(
                            {
                                "role": str(role),
                                "content": str(content),
                            }
                        )
                    idx += 1
                else:
                    break
            if messages:
                return messages

        return []

    def _extract_llm_output(self, span: ReadableSpan) -> str:
        for key in (
            "lk.response.text",
            "gen_ai.response.text",
            "gen_ai.completion.text",
            "output",
            "response",
            "completion",
            "text",
        ):
            val = span.attributes.get(key)
            if val:
                return str(val)
        return ""

    def _fallback_messages(self, span: ReadableSpan, span_name: str) -> List[dict]:
        system_prompt = (
            span.attributes.get("gen_ai.system")
            or span.attributes.get("system")
            or ""
        )
        user_prompt = (
            span.attributes.get("gen_ai.user")
            or span.attributes.get("user")
            or span.attributes.get("input")
            or ""
        )
        messages: List[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": str(system_prompt)})
        if user_prompt:
            messages.append({"role": "user", "content": str(user_prompt)})
        if not messages:
            messages.append({"role": "user", "content": f"LLM request: {span_name}"})
        return messages

    def _split_messages(
        self, messages: List[dict]
    ) -> Tuple[Optional[dict], Optional[dict], List[dict]]:
        system_msg: Optional[dict] = None
        first_user_msg: Optional[dict] = None
        remaining: List[dict] = []
        user_seen = False

        for msg in messages:
            role = msg.get("role", "")
            if role == "system" and system_msg is None:
                system_msg = msg
            elif role == "user" and not user_seen:
                first_user_msg = msg
                user_seen = True
            elif user_seen:
                remaining.append(msg)

        return system_msg, first_user_msg, remaining

    def _track_messages(
        self,
        trace_id: str,
        messages: List[dict],
        output: str,
    ) -> None:
        if trace_id not in self.conversation_messages:
            self.conversation_messages[trace_id] = []
            for msg in messages:
                if msg.get("role") == "system":
                    self.conversation_messages[trace_id].append(msg)
                    break

        # Last user message for this span
        last_user = next(
            (m for m in reversed(messages) if m.get("role") == "user"),
            None,
        )
        if last_user:
            new_content = str(last_user.get("content", "")).strip().lower()
            existing = [
                str(m.get("content", "")).strip().lower()
                for m in self.conversation_messages[trace_id]
                if m.get("role") == "user"
            ]
            if new_content and new_content not in existing:
                self.conversation_messages[trace_id].append(last_user)

        if output:
            new_assistant = output.strip().lower()
            existing_assistant = [
                str(m.get("content", "")).strip().lower()
                for m in self.conversation_messages[trace_id]
                if m.get("role") == "assistant"
            ]
            if new_assistant not in existing_assistant:
                self.conversation_messages[trace_id].append(
                    {"role": "assistant", "content": output}
                )

    def _release_job_span(
        self,
        trace_id: str,
        prompt_msgs: List[dict],
        completion_msgs: List[dict],
    ) -> None:
        job_span = self.deferred_job_spans.pop(trace_id, None)
        if not job_span:
            return
        if prompt_msgs:
            self._set_prompt(job_span, deepcopy(prompt_msgs))
        if completion_msgs:
            self._set_completion(job_span, deepcopy(completion_msgs))
        self._export(job_span)

    def _export(self, span: ReadableSpan) -> None:
        if self.downstream:
            self.downstream.on_end(span)


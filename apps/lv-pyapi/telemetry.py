import logging
import os
from typing import Optional, Sequence

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor, LogExporter, LogRecordExportResult
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import (
    MetricExporter,
    MetricExportResult,
    PeriodicExportingMetricReader,
)
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter, SpanExportResult
from opentelemetry.sdk.trace.export import ReadableSpan

from opentelemetry._logs import set_logger_provider

logger = logging.getLogger(__name__)

# Short HTTP timeout so a dead collector does not block exporter threads for long.
_DEFAULT_EXPORT_TIMEOUT_S = 5.0


def _env_truthy(name: str) -> bool:
    v = os.getenv(name, "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _export_timeout() -> Optional[float]:
    raw = os.getenv("OTEL_EXPORTER_OTLP_TIMEOUT")
    if raw is None or raw.strip() == "":
        return _DEFAULT_EXPORT_TIMEOUT_S
    try:
        return float(raw)
    except ValueError:
        return _DEFAULT_EXPORT_TIMEOUT_S


def _is_langsmith_otel_endpoint(endpoint: str) -> bool:
    """LangSmith OTLP base URLs are not compatible with generic OTLP/HTTP /v1/logs (404) and spam errors."""
    u = (endpoint or "").lower()
    return "smith.langchain" in u or "langsmith" in u


class _OtelExportErrorFilter(logging.Filter):
    """Avoid feedback loops: export failures must not be re-emitted via OTLP LoggingHandler."""

    def filter(self, record: logging.LogRecord) -> bool:
        name = record.name
        if name.startswith("opentelemetry") or name.startswith("urllib3"):
            return False
        return True


class _FaultTolerantSpanExporter(SpanExporter):
    def __init__(self, inner: SpanExporter):
        self._inner = inner

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        try:
            return self._inner.export(spans)
        except Exception:
            logger.debug("OTLP span export failed", exc_info=True)
            return SpanExportResult.FAILURE

    def shutdown(self) -> None:
        try:
            self._inner.shutdown()
        except Exception:
            logger.debug("OTLP span exporter shutdown failed", exc_info=True)

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        try:
            return self._inner.force_flush(timeout_millis)
        except Exception:
            return False


class _FaultTolerantMetricExporter(MetricExporter):
    def __init__(self, inner: MetricExporter):
        super().__init__(
            preferred_temporality=getattr(inner, "_preferred_temporality", None),
            preferred_aggregation=getattr(inner, "_preferred_aggregation", None),
        )
        self._inner = inner

    def export(self, metrics_data, timeout_millis: float = 10_000, **kwargs) -> MetricExportResult:
        try:
            return self._inner.export(metrics_data, timeout_millis=timeout_millis, **kwargs)
        except Exception:
            logger.debug("OTLP metrics export failed", exc_info=True)
            return MetricExportResult.FAILURE

    def force_flush(self, timeout_millis: float = 10_000) -> bool:
        try:
            return self._inner.force_flush(timeout_millis)
        except Exception:
            return False

    def shutdown(self, timeout_millis: float = 30_000, **kwargs) -> None:
        try:
            self._inner.shutdown(timeout_millis=timeout_millis, **kwargs)
        except Exception:
            logger.debug("OTLP metrics exporter shutdown failed", exc_info=True)


class _FaultTolerantLogExporter(LogExporter):
    def __init__(self, inner: LogExporter):
        self._inner = inner

    def export(self, batch) -> LogRecordExportResult:
        try:
            return self._inner.export(batch)
        except Exception:
            logger.debug("OTLP log export failed", exc_info=True)
            return LogRecordExportResult.FAILURE

    def shutdown(self) -> None:
        try:
            self._inner.shutdown()
        except Exception:
            logger.debug("OTLP log exporter shutdown failed", exc_info=True)


def _ensure_console_logging() -> None:
    """
    Ensure logs are visible on stdout/stderr even when OpenTelemetry logging
    instrumentation is enabled.
    """
    root_logger = logging.getLogger()
    has_stream_handler = any(isinstance(h, logging.StreamHandler) for h in root_logger.handlers)
    if has_stream_handler:
        return

    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)
    stream_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    )
    root_logger.addHandler(stream_handler)


def setup_telemetry(app=None, engine=None) -> None:
    if _env_truthy("OTEL_SDK_DISABLED"):
        logger.info("OpenTelemetry disabled (OTEL_SDK_DISABLED)")
        return

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4318")
    if _is_langsmith_otel_endpoint(endpoint):
        logger.info(
            "OpenTelemetry skipped: OTEL_EXPORTER_OTLP_ENDPOINT looks like LangSmith; "
            "it is not a generic OTLP collector (avoids 404 log export spam and memory pressure). "
            "Unset it or use your GCP collector URL, or set OTEL_SDK_DISABLED=true."
        )
        return
    service_name = os.getenv("OTEL_SERVICE_NAME", "lv-pyapi")
    timeout = _export_timeout()

    resource = Resource.create({SERVICE_NAME: service_name})

    trace_exporter = _FaultTolerantSpanExporter(
        OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", timeout=timeout)
    )
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(tracer_provider)

    metric_exporter = _FaultTolerantMetricExporter(
        OTLPMetricExporter(endpoint=f"{endpoint}/v1/metrics", timeout=timeout)
    )
    meter_provider = MeterProvider(
        resource=resource,
        metric_readers=[
            PeriodicExportingMetricReader(metric_exporter),
        ],
    )
    metrics.set_meter_provider(meter_provider)

    log_exporter = _FaultTolerantLogExporter(
        OTLPLogExporter(endpoint=f"{endpoint}/v1/logs", timeout=timeout)
    )
    log_provider = LoggerProvider(resource=resource)
    log_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
    set_logger_provider(log_provider)
    LoggingInstrumentor().instrument(set_logging_format=True)

    otel_handler = LoggingHandler(level=logging.INFO, logger_provider=log_provider)
    otel_handler.addFilter(_OtelExportErrorFilter())
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(otel_handler)
    _ensure_console_logging()

    if app is not None:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor.instrument_app(app)

    if engine is not None:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        SQLAlchemyInstrumentor().instrument(engine=engine)

    logger.info(
        "OpenTelemetry configured — service=%s endpoint=%s",
        service_name,
        endpoint,
    )

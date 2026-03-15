🚀 Implement OpenTelemetry & LGTM Observability in Living Vectors

🧭 Overview

We want to introduce OpenTelemetry-based observability into the Living Vectors project to improve system visibility and debugging capabilities at Clarvo.

This initiative will use the LGTM stack (Loki, Grafana, Tempo, Mimir) to provide a modern observability platform for metrics, logs, and traces. If this works well in Living vectors we are gonna implement this at Clarvo as well.

The goal is to enable full observability locally first, and then extend the setup to Google Cloud so we can monitor production environments as well.

🎯 Objectives

Integrate OpenTelemetry

Instrument the Python services
Instrument the TypeScript (Next.js) services
Capture HTTP requests, traces, and relevant metrics
Deploy LGTM Stack Locally

Add required components to Docker Compose
Run the following locally:
Grafana 📊
Tempo (traces)
Loki (logs)
Mimir / Prometheus-compatible metrics store
OpenTelemetry Collector
Connect Application Telemetry

Configure applications to export telemetry data via OpenTelemetry SDK
Send traces, logs, and metrics through the OpenTelemetry Collector
Route telemetry to the LGTM components
Validate Observability in Grafana

Ensure HTTP requests from the services generate traces
Confirm the requests can be seen and explored in Grafana
Verify Local Observability

Ensure local requests generate:
traces in Tempo
logs in Loki
metrics in Mimir/Prometheus
Confirm Grafana can display the collected telemetry
Extend Observability to Google Cloud

Deploy OpenTelemetry configuration compatible with Google Cloud environments
Ensure production workloads export telemetry
Connect production telemetry into the LGTM stack
Validate visibility into production requests and services
🧱 Key Deliverables

OpenTelemetry instrumentation for Python and Next.js services
Docker Compose setup for LGTM stack
OpenTelemetry Collector configuration
Documentation on:
running the stack locally
how telemetry flows through the system
enabling observability in production (Google Cloud)
💡 Expected Outcome

After completion:

Developers can run Living Vectors locally with full observability
HTTP requests can be inspected through distributed traces
Logs and metrics are accessible through Grafana
Production deployments in Google Cloud provide the same visibility
This will establish a baseline observability architecture that could later be reused across other Clarvo services.

🔎 References

OpenTelemetry
LGTM Stack (Loki, Grafana, Tempo, Mimir)
Grafana Observability Stack
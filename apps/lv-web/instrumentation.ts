export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import(
      '@opentelemetry/auto-instrumentations-node'
    );
    const { OTLPTraceExporter } = await import(
      '@opentelemetry/exporter-trace-otlp-http'
    );
    const { OTLPMetricExporter } = await import(
      '@opentelemetry/exporter-metrics-otlp-http'
    );
    const { OTLPLogExporter } = await import(
      '@opentelemetry/exporter-logs-otlp-http'
    );
    const { PeriodicExportingMetricReader } = await import(
      '@opentelemetry/sdk-metrics'
    );
    const { BatchLogRecordProcessor } = await import(
      '@opentelemetry/sdk-logs'
    );
    const { resourceFromAttributes } = await import(
      '@opentelemetry/resources'
    );
    const { ATTR_SERVICE_NAME } = await import(
      '@opentelemetry/semantic-conventions'
    );

    const endpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318';

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'lv-web',
    });

    const sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${endpoint}/v1/metrics`,
        }),
      }),
      logRecordProcessor: new BatchLogRecordProcessor(
        new OTLPLogExporter({ url: `${endpoint}/v1/logs` }),
      ),
      instrumentations: [
        getNodeAutoInstrumentations({
          // fs instrumentation is very noisy in Next.js
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();
  }
}

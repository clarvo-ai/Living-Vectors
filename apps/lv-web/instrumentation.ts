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
    const { logs } = await import('@opentelemetry/api-logs');
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

    const serviceName = process.env.OTEL_SERVICE_NAME ?? 'lv-web';
    const otelLogger = logs.getLogger(serviceName);

    // Bridge Node console logs into OTel so runtime logs reach Loki.
    const patchedFlag = '__lvWebConsoleOtelPatched';
    const globalState = globalThis as typeof globalThis & {
      [patchedFlag]?: boolean;
    };
    if (!globalState[patchedFlag]) {
      const bridgeConsoleMethod = (
        method: 'debug' | 'info' | 'warn' | 'error' | 'log',
        severityText: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
      ) => {
        const original = console[method].bind(console);
        console[method] = (...args: unknown[]) => {
          original(...args);
          const body = args
            .map((arg) =>
              typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2),
            )
            .join(' ');
          otelLogger.emit({ severityText, body });
        };
      };

      bridgeConsoleMethod('debug', 'DEBUG');
      bridgeConsoleMethod('info', 'INFO');
      bridgeConsoleMethod('warn', 'WARN');
      bridgeConsoleMethod('error', 'ERROR');
      bridgeConsoleMethod('log', 'INFO');
      globalState[patchedFlag] = true;
    }

    // Emit at least one OTel log record from app startup.
    otelLogger.emit({
      severityText: 'INFO',
      body: `OpenTelemetry configured for ${serviceName}`,
    });
  }
}

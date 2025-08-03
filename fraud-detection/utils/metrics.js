import client from 'prom-client';

// Define a histogram to track latency
export const requestLatency = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: client.linearBuckets(0, 1, 4)
});

// Prometheus metrics endpoint
export async function metricsEndpoint(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

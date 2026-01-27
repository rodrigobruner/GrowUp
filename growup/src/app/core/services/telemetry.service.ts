import { Injectable } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  constructor(private readonly logger: LoggerService) {}

  captureError(error: unknown, context?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error('telemetry.error', { message, context });
    // TODO: wire to Sentry or backend endpoint.
  }

  track(event: string, properties?: Record<string, unknown>): void {
    this.logger.info(`telemetry.${event}`, properties);
    // TODO: wire to analytics.
  }
}

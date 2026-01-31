/**
 * Plugin Executor
 *
 * Executes plugin fetch operations with timeout protection and error handling.
 */

import type {
  FeedPlugin,
  FetchContext,
  FeedResult,
  RegisteredPlugin,
} from "./types";
import {
  PluginError,
  PluginTimeoutError,
  PluginValidationError,
} from "./types";
import { PluginValidator } from "./validator";

export interface ExecutorOptions {
  /** Timeout in milliseconds (default: 5 minutes) */
  timeoutMs?: number;
  /** Validate result before returning */
  validate?: boolean;
}

export class PluginExecutor {
  private validator = new PluginValidator();

  /**
   * Execute a plugin fetch operation
   */
  async execute(
    registered: RegisteredPlugin,
    context: FetchContext,
    options: ExecutorOptions = {}
  ): Promise<FeedResult> {
    const { plugin } = registered;
    const timeoutMs = options.timeoutMs ?? 300000; // 5 minutes default
    const validate = options.validate ?? true;

    const startTime = Date.now();
    console.log(`[Plugin Executor] Executing ${plugin.meta.id}...`);

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(plugin, context, timeoutMs);

      // Validate result
      if (validate) {
        const validation = this.validator.validateFeedResult(result);
        if (!validation.valid) {
          console.error(
            `[Plugin Executor] Validation failed for ${plugin.meta.id}:`,
            validation.errors
          );
          throw new PluginValidationError(plugin.meta.id, validation.errors);
        }

        if (validation.warnings.length > 0) {
          console.warn(
            `[Plugin Executor] Validation warnings for ${plugin.meta.id}:`,
            validation.warnings
          );
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[Plugin Executor] ${plugin.meta.id} completed in ${duration}ms, fetched ${result.items.length} items`
      );

      // Update metrics
      this.updateMetrics(registered, {
        success: true,
        duration,
        itemCount: result.items.length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[Plugin Executor] ${plugin.meta.id} failed after ${duration}ms:`,
        error
      );

      // Update metrics
      this.updateMetrics(registered, {
        success: false,
        duration,
        itemCount: 0,
      });

      throw error;
    }
  }

  /**
   * Execute plugin with timeout
   */
  private async executeWithTimeout(
    plugin: FeedPlugin,
    context: FetchContext,
    timeoutMs: number
  ): Promise<FeedResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new PluginTimeoutError(plugin.meta.id, timeoutMs));
      }, timeoutMs);

      plugin
        .fetch(context)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(
            new PluginError(
              `Plugin fetch failed: ${error.message}`,
              plugin.meta.id,
              "FETCH_FAILED",
              error
            )
          );
        });
    });
  }

  /**
   * Update plugin metrics after execution
   */
  private updateMetrics(
    registered: RegisteredPlugin,
    result: {
      success: boolean;
      duration: number;
      itemCount: number;
    }
  ): void {
    const { metrics } = registered;

    // Update consecutive failures
    if (result.success) {
      metrics.consecutiveFailures = 0;
      metrics.lastFetchAt = new Date();
    } else {
      metrics.consecutiveFailures++;
    }

    // Update average fetch duration (rolling average)
    if (metrics.avgFetchDuration === 0) {
      metrics.avgFetchDuration = result.duration;
    } else {
      metrics.avgFetchDuration = Math.round(
        metrics.avgFetchDuration * 0.9 + result.duration * 0.1
      );
    }

    // Update items created
    if (result.success) {
      metrics.itemsCreated += result.itemCount;
    }

    // Update success rate (rolling average over ~100 executions)
    if (result.success) {
      metrics.successRate = metrics.successRate * 0.99 + 0.01;
    } else {
      metrics.successRate = metrics.successRate * 0.99;
    }

    // Update health status
    if (metrics.consecutiveFailures === 0) {
      metrics.status = "healthy";
    } else if (metrics.consecutiveFailures < 3) {
      metrics.status = "degraded";
    } else if (metrics.consecutiveFailures < 10) {
      metrics.status = "failing";
    } else {
      metrics.status = "disabled";
    }
  }

  /**
   * Check plugin health
   */
  async checkHealth(plugin: FeedPlugin): Promise<boolean> {
    if (!plugin.healthCheck) {
      // No health check method, assume healthy
      return true;
    }

    try {
      const status = (await Promise.race([
        plugin.healthCheck(),
        this.timeout(10000, "Health check timed out"),
      ])) as { healthy: boolean };

      return status.healthy;
    } catch (error) {
      console.error(
        `[Plugin Executor] Health check failed for ${plugin.meta.id}:`,
        error
      );
      return false;
    }
  }

  /**
   * Helper for timeout promise
   */
  private timeout<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}

export const pluginExecutor = new PluginExecutor();

/**
 * Plugin Registry
 *
 * Manages plugin discovery, loading, and lifecycle.
 */

import type {
  FeedPlugin,
  PluginConfig,
  RegisteredPlugin,
  PluginMetrics,
  PluginStatus,
} from "./types";
import { PluginError } from "./types";

export class PluginRegistry {
  private plugins: Map<string, RegisteredPlugin> = new Map();

  /**
   * Register a plugin
   */
  async register(plugin: FeedPlugin, config: PluginConfig): Promise<void> {
    const pluginId = plugin.meta.id;

    if (this.plugins.has(pluginId)) {
      throw new PluginError(
        `Plugin ${pluginId} is already registered`,
        pluginId,
        "ALREADY_REGISTERED"
      );
    }

    // Validate plugin interface
    this.validatePlugin(plugin);

    // Initialize plugin
    try {
      await plugin.initialize(config);
    } catch (error) {
      throw new PluginError(
        `Failed to initialize plugin ${pluginId}`,
        pluginId,
        "INITIALIZATION_FAILED",
        error
      );
    }

    // Create metrics tracking
    const metrics: PluginMetrics = {
      pluginId,
      successRate: 1.0,
      avgFetchDuration: 0,
      itemsCreated: 0,
      consecutiveFailures: 0,
      status: "healthy",
    };

    // Register plugin
    this.plugins.set(pluginId, {
      plugin,
      config,
      metrics,
      status: "active",
    });

    console.log(`[Plugin Registry] Registered plugin: ${pluginId}`);
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<void> {
    const registered = this.plugins.get(pluginId);
    if (!registered) {
      throw new PluginError(
        `Plugin ${pluginId} is not registered`,
        pluginId,
        "NOT_FOUND"
      );
    }

    // Shutdown plugin
    try {
      await registered.plugin.shutdown();
    } catch (error) {
      console.error(
        `[Plugin Registry] Error shutting down plugin ${pluginId}:`,
        error
      );
    }

    this.plugins.delete(pluginId);
    console.log(`[Plugin Registry] Unregistered plugin: ${pluginId}`);
  }

  /**
   * Get a registered plugin
   */
  get(pluginId: string): RegisteredPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAll(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get active plugins only
   */
  getActive(): RegisteredPlugin[] {
    return this.getAll().filter((p) => p.status === "active");
  }

  /**
   * Update plugin status
   */
  updateStatus(pluginId: string, status: PluginStatus): void {
    const registered = this.plugins.get(pluginId);
    if (registered) {
      registered.status = status;
      console.log(`[Plugin Registry] Updated ${pluginId} status to: ${status}`);
    }
  }

  /**
   * Update plugin metrics
   */
  updateMetrics(pluginId: string, updates: Partial<PluginMetrics>): void {
    const registered = this.plugins.get(pluginId);
    if (registered) {
      registered.metrics = {
        ...registered.metrics,
        ...updates,
      };
    }
  }

  /**
   * Validate plugin implements required interface
   */
  private validatePlugin(plugin: FeedPlugin): void {
    const required = [
      "meta",
      "capabilities",
      "initialize",
      "fetch",
      "shutdown",
    ];

    for (const field of required) {
      if (!(field in plugin)) {
        throw new Error(`Plugin missing required field: ${field}`);
      }
    }

    // Validate meta
    if (!plugin.meta.id || typeof plugin.meta.id !== "string") {
      throw new Error("Plugin meta.id must be a non-empty string");
    }

    if (!plugin.meta.name || typeof plugin.meta.name !== "string") {
      throw new Error("Plugin meta.name must be a non-empty string");
    }

    if (!plugin.meta.version || typeof plugin.meta.version !== "string") {
      throw new Error("Plugin meta.version must be a non-empty string");
    }

    // Validate capabilities
    if (
      !Array.isArray(plugin.capabilities.entityTypes) ||
      plugin.capabilities.entityTypes.length === 0
    ) {
      throw new Error("Plugin must support at least one entity type");
    }

    // Validate methods are functions
    if (typeof plugin.initialize !== "function") {
      throw new Error("Plugin initialize must be a function");
    }

    if (typeof plugin.fetch !== "function") {
      throw new Error("Plugin fetch must be a function");
    }

    if (typeof plugin.shutdown !== "function") {
      throw new Error("Plugin shutdown must be a function");
    }
  }

  /**
   * Shutdown all plugins
   */
  async shutdownAll(): Promise<void> {
    console.log("[Plugin Registry] Shutting down all plugins...");

    const shutdownPromises = Array.from(this.plugins.keys()).map((id) =>
      this.unregister(id).catch((error) =>
        console.error(`[Plugin Registry] Error unregistering ${id}:`, error)
      )
    );

    await Promise.all(shutdownPromises);
    console.log("[Plugin Registry] All plugins shut down");
  }
}

// Global registry instance
export const pluginRegistry = new PluginRegistry();

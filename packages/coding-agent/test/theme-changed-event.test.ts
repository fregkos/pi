/**
 * Tests for the theme_changed extension event.
 *
 * Validates that theme_changed events are dispatched to extension
 * handlers via ExtensionRunner with correct event data.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthStorage } from "../src/core/auth-storage.js";
import { createExtensionRuntime } from "../src/core/extensions/loader.js";
import { ExtensionRunner } from "../src/core/extensions/runner.js";
import type {
	Extension,
	ExtensionActions,
	ExtensionContextActions,
	ThemeChangedEvent,
} from "../src/core/extensions/types.js";
import { ModelRegistry } from "../src/core/model-registry.js";
import { SessionManager } from "../src/core/session-manager.js";

describe("theme_changed event", () => {
	let tempDir: string;
	let sessionManager: SessionManager;
	let modelRegistry: ModelRegistry;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-theme-event-test-"));
		sessionManager = SessionManager.inMemory();
		const authStorage = AuthStorage.create(path.join(tempDir, "auth.json"));
		modelRegistry = ModelRegistry.create(authStorage);
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	const extensionActions: ExtensionActions = {
		sendMessage: () => {},
		sendUserMessage: () => {},
		appendEntry: () => {},
		setSessionName: () => {},
		getSessionName: () => undefined,
		setLabel: () => {},
		getActiveTools: () => [],
		getAllTools: () => [],
		setActiveTools: () => {},
		refreshTools: () => {},
		getCommands: () => [],
		setModel: async () => false,
		getThinkingLevel: () => "off" as const,
		setThinkingLevel: () => {},
	};

	const extensionContextActions: ExtensionContextActions = {
		getModel: () => undefined,
		isIdle: () => true,
		getSignal: () => undefined,
		abort: () => {},
		hasPendingMessages: () => false,
		shutdown: () => {},
		getContextUsage: () => undefined,
		compact: () => {},
		getSystemPrompt: () => "",
	};

	it("dispatches theme_changed event to extension handlers", async () => {
		const received: ThemeChangedEvent[] = [];

		const handler: (...args: unknown[]) => Promise<unknown> = (event: any) => {
			received.push(event);
			return Promise.resolve();
		};

		const extension: Extension = {
			path: "test-1",
			resolvedPath: "test-1",
			sourceInfo: {
				path: "test-1",
				source: "test",
				scope: "temporary",
				origin: "top-level",
			},
			handlers: new Map([["theme_changed", [handler as (...args: unknown[]) => Promise<unknown>]]]),
			tools: new Map(),
			messageRenderers: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
		};

		const runtime = createExtensionRuntime();
		const runner = new ExtensionRunner([extension], runtime, tempDir, sessionManager, modelRegistry);
		runner.bindCore(extensionActions, extensionContextActions);

		const event: ThemeChangedEvent = {
			type: "theme_changed",
			theme: { name: "light" },
			previousTheme: { name: "dark" },
		};

		await runner.emit(event);

		expect(received).toHaveLength(1);
		expect(received[0].type).toBe("theme_changed");
		expect(received[0].theme.name).toBe("light");
		expect(received[0].previousTheme!.name).toBe("dark");
	});

	it("fires theme_changed with undefined previousTheme", async () => {
		const received: ThemeChangedEvent[] = [];

		const handler: (...args: unknown[]) => Promise<unknown> = (event: any) => {
			received.push(event);
			return Promise.resolve();
		};

		const extension: Extension = {
			path: "test-2",
			resolvedPath: "test-2",
			sourceInfo: {
				path: "test-2",
				source: "test",
				scope: "temporary",
				origin: "top-level",
			},
			handlers: new Map([["theme_changed", [handler as (...args: unknown[]) => Promise<unknown>]]]),
			tools: new Map(),
			messageRenderers: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
		};

		const runtime = createExtensionRuntime();
		const runner = new ExtensionRunner([extension], runtime, tempDir, sessionManager, modelRegistry);
		runner.bindCore(extensionActions, extensionContextActions);

		const event: ThemeChangedEvent = {
			type: "theme_changed",
			theme: { name: "dark" },
			previousTheme: undefined,
		};

		await runner.emit(event);

		expect(received).toHaveLength(1);
		expect(received[0].type).toBe("theme_changed");
		expect(received[0].theme.name).toBe("dark");
		expect(received[0].previousTheme).toBeUndefined();
	});

	it("does not throw when no extensions listen for theme_changed", async () => {
		const extension: Extension = {
			path: "test-3",
			resolvedPath: "test-3",
			sourceInfo: {
				path: "test-3",
				source: "test",
				scope: "temporary",
				origin: "top-level",
			},
			handlers: new Map(),
			tools: new Map(),
			messageRenderers: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
		};

		const runtime = createExtensionRuntime();
		const runner = new ExtensionRunner([extension], runtime, tempDir, sessionManager, modelRegistry);
		runner.bindCore(extensionActions, extensionContextActions);

		const event: ThemeChangedEvent = {
			type: "theme_changed",
			theme: { name: "light" },
			previousTheme: { name: "dark" },
		};

		await expect(runner.emit(event)).resolves.toBeUndefined();
	});

	it("handles multiple extensions listening for theme_changed", async () => {
		const received1: ThemeChangedEvent[] = [];
		const received2: ThemeChangedEvent[] = [];

		const handler1: (...args: unknown[]) => Promise<unknown> = (event: any) => {
			received1.push(event);
			return Promise.resolve();
		};
		const handler2: (...args: unknown[]) => Promise<unknown> = (event: any) => {
			received2.push(event);
			return Promise.resolve();
		};

		const ext1: Extension = {
			path: "multi-1",
			resolvedPath: "multi-1",
			sourceInfo: {
				path: "multi-1",
				source: "test",
				scope: "temporary",
				origin: "top-level",
			},
			handlers: new Map([["theme_changed", [handler1]]]),
			tools: new Map(),
			messageRenderers: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
		};

		const ext2: Extension = {
			path: "multi-2",
			resolvedPath: "multi-2",
			sourceInfo: {
				path: "multi-2",
				source: "test",
				scope: "temporary",
				origin: "top-level",
			},
			handlers: new Map([["theme_changed", [handler2]]]),
			tools: new Map(),
			messageRenderers: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
		};

		const runtime = createExtensionRuntime();
		const runner = new ExtensionRunner([ext1, ext2], runtime, tempDir, sessionManager, modelRegistry);
		runner.bindCore(extensionActions, extensionContextActions);

		const event: ThemeChangedEvent = {
			type: "theme_changed",
			theme: { name: "solarized" },
			previousTheme: { name: "dark" },
		};

		await runner.emit(event);

		expect(received1).toHaveLength(1);
		expect(received1[0].theme.name).toBe("solarized");
		expect(received1[0].previousTheme!.name).toBe("dark");

		expect(received2).toHaveLength(1);
		expect(received2[0].theme.name).toBe("solarized");
		expect(received2[0].previousTheme!.name).toBe("dark");
	});

	it("passes valid ExtensionContext to handler", async () => {
		let capturedCwd: string | undefined;

		const ctxHandler: (...args: unknown[]) => Promise<unknown> = (_event: any, ctx: any) => {
			capturedCwd = ctx.cwd;
			return Promise.resolve();
		};

		const extension: Extension = {
			path: "test-ctx",
			resolvedPath: "test-ctx",
			sourceInfo: {
				path: "test-ctx",
				source: "test",
				scope: "temporary",
				origin: "top-level",
			},
			handlers: new Map([["theme_changed", [ctxHandler]]]),
			tools: new Map(),
			messageRenderers: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
		};

		const runtime = createExtensionRuntime();
		const runner = new ExtensionRunner([extension], runtime, tempDir, sessionManager, modelRegistry);
		runner.bindCore(extensionActions, extensionContextActions);

		const event: ThemeChangedEvent = {
			type: "theme_changed",
			theme: { name: "light" },
			previousTheme: { name: "dark" },
		};

		await runner.emit(event);

		expect(capturedCwd).toBe(tempDir);
	});
});

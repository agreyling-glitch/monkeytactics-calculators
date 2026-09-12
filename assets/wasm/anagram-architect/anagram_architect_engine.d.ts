/* tslint:disable */
/* eslint-disable */

export function cancel_search(): void;

export function init_engine(dictionary: any): void;

export function init_language_metadata(records: any): void;

export function init_language_model(records: any): void;

export function start_search(source: string, options: any): void;

export function step_search(node_budget: number): any;

/**
 * Verifies that the engine is running on an approved MonkeyTactics host.
 * The caller must pass `location.hostname`, without a port.
 */
export function verify_domain(host: string): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly cancel_search: () => void;
    readonly init_engine: (a: number, b: number) => void;
    readonly init_language_metadata: (a: number, b: number) => void;
    readonly init_language_model: (a: number, b: number) => void;
    readonly start_search: (a: number, b: number, c: number, d: number) => void;
    readonly step_search: (a: number) => number;
    readonly verify_domain: (a: number, b: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

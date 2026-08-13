/* tslint:disable */
/* eslint-disable */

/**
 * Runs the Rust decoder against the original image and, when requested,
 * a bounded sequence of deterministic preprocessing passes.
 */
export function decode_qr(rgba: Uint8Array, width: number, height: number, enhanced: boolean): any;

/**
 * Reconstructs a conventional square QR bitmap by sampling module centers.
 * This pass is consumed by the ZXing fallback for heavily stylized QR art.
 */
export function normalize_qr_candidate(rgba: Uint8Array, width: number, height: number, dimension: number, shrink: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly decode_qr: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly normalize_qr_candidate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
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

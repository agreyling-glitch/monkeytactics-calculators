/* tslint:disable */
/* eslint-disable */

/**
 * Generates multiple QR codes in one WASM call for CSV-driven batch export.
 */
export function batch_generate(list: any): any;

/**
 * Returns a vector PDF containing the active QR code.
 */
export function export_pdf(): Uint8Array;

/**
 * Renders the active QR as a high-DPI PNG and returns its bytes.
 */
export function export_png(dpi: number): Uint8Array;

/**
 * Returns the active styled QR as scalable SVG markup.
 */
export function export_svg(): string;

/**
 * Encodes content into a QR matrix, applies styling, and returns preview data.
 */
export function generate_qr(data: any): any;

/**
 * Re-applies colors, module shapes, eyes, logo rules, and effects to the active QR.
 */
export function style_qr(options: any): any;

/**
 * Verifies that the WASM engine is running on an approved MonkeyTactics host.
 */
export function verify_domain(host: string): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly batch_generate: (a: number) => number;
    readonly export_pdf: (a: number) => void;
    readonly export_png: (a: number, b: number) => void;
    readonly export_svg: (a: number) => void;
    readonly generate_qr: (a: number) => number;
    readonly style_qr: (a: number) => number;
    readonly verify_domain: (a: number, b: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
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

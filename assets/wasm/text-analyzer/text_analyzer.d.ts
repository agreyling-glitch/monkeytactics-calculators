/* tslint:disable */
/* eslint-disable */

/**
 * JavaScript-facing analysis result. Complex values are exposed as native JS
 * arrays and objects, while `toJSON()` makes the full result directly exportable.
 */
export class AnalysisResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    toJSON(): any;
    readonly char_count: number;
    readonly char_no_spaces: number;
    readonly keyword_frequency: any;
    readonly ngram_data: any;
    readonly paragraph_count: number;
    readonly readability_scores: any;
    readonly sentence_count: number;
    readonly top_keywords: any;
    readonly visualization_data: any;
    readonly word_count: number;
}

export function analyze_text(input: string): AnalysisResult;

/**
 * Verifies that the WASM engine is running on an approved MonkeyTactics host.
 */
export function verify_domain(host: string): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_analysisresult_free: (a: number, b: number) => void;
    readonly analysisresult_char_count: (a: number) => number;
    readonly analysisresult_char_no_spaces: (a: number) => number;
    readonly analysisresult_keyword_frequency: (a: number) => number;
    readonly analysisresult_ngram_data: (a: number) => number;
    readonly analysisresult_paragraph_count: (a: number) => number;
    readonly analysisresult_readability_scores: (a: number) => number;
    readonly analysisresult_sentence_count: (a: number) => number;
    readonly analysisresult_toJSON: (a: number) => number;
    readonly analysisresult_top_keywords: (a: number) => number;
    readonly analysisresult_visualization_data: (a: number) => number;
    readonly analysisresult_word_count: (a: number) => number;
    readonly analyze_text: (a: number, b: number) => number;
    readonly verify_domain: (a: number, b: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
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

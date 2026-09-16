// Bounded, duplicate-rejecting UTF-8 JSON ingress. No reviver can recover duplicates.
import {evaluate} from './checker.mjs';
export const MAX_BYTES = 1048576, MAX_DEPTH = 64;
export class WireError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function parseWire(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError('Wire input must be bytes');
  if (bytes.byteLength > MAX_BYTES) throw new WireError('WIRE_LIMIT');
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes); }
  catch { throw new WireError('WIRE_UTF8'); }
  let pos = 0;
  const bad = code => { throw new WireError(code); };
  const whitespace = () => { while (/[\x20\t\r\n]/.test(text[pos] ?? '') && pos < text.length) pos++; };
  function string() {
    const start = pos++;
    while (pos < text.length) {
      const c = text[pos++];
      if (c === '\\') { pos++; continue; }
      if (c === '"') {
        let value;
        try { value = JSON.parse(text.slice(start, pos)); } catch { bad('WIRE_JSON'); }
        if (!value.isWellFormed()) bad('INVALID_UNICODE');
        return value;
      }
    }
    bad('WIRE_JSON');
  }
  function value(depth) {
    whitespace();
    const c = text[pos];
    if (c === '"') return string();
    if (c === '{' || c === '[') {
      if (depth >= MAX_DEPTH) bad('WIRE_LIMIT');
      pos++;
      const object = c === '{', end = object ? '}' : ']';
      const result = object ? {} : [], names = new Set();
      whitespace();
      if (text[pos] === end) { pos++; return result; }
      while (true) {
        whitespace();
        let key;
        if (object) {
          if (text[pos] !== '"') bad('WIRE_JSON');
          key = string();
          if (names.has(key)) bad('WIRE_DUPLICATE_KEY');
          names.add(key);
          whitespace();
          if (text[pos++] !== ':') bad('WIRE_JSON');
        }
        const child = value(depth + 1);
        if (object) Object.defineProperty(result, key, {value: child, enumerable: true, writable: true, configurable: true});
        else result.push(child);
        whitespace();
        const next = text[pos++];
        if (next === end) return result;
        if (next !== ',') bad('WIRE_JSON');
      }
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(pos));
    if (!token) bad('WIRE_JSON');
    pos += token[0].length;
    const result = JSON.parse(token[0]);
    if (typeof result === 'number' && !Number.isFinite(result)) bad('WIRE_JSON');
    return result;
  }
  const result = value(0);
  whitespace();
  if (pos !== text.length) bad('WIRE_JSON');
  return result;
}
export function evaluateWire(bundleBytes, contextBytes) {
  try { return evaluate(parseWire(bundleBytes), parseWire(contextBytes)); }
  catch (error) {
    if (!(error instanceof WireError)) throw error;
    return {status: 'input_error', verdict: null, decision: 'refuse', codes: [error.code]};
  }
}

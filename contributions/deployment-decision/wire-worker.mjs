// NDJSON test/CLI bridge. Wire bytes remain base64 until duplicate-rejecting ingress.
import {createInterface} from 'node:readline';
import {evaluateWire, parseWire, WireError} from './wire.mjs';
for await (const line of createInterface({input: process.stdin, crlfDelay: Infinity})) {
  const request = JSON.parse(line);
  if (request.parse !== undefined) {
    try { console.log(JSON.stringify({value: parseWire(Buffer.from(request.parse, 'base64'))})); }
    catch (e) { if (!(e instanceof WireError)) throw e; console.log(JSON.stringify({error: e.code})); }
  } else {
    console.log(JSON.stringify(evaluateWire(Buffer.from(request.bundle, 'base64'), Buffer.from(request.context, 'base64'))));
  }
}

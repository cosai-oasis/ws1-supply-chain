// Public ingress: producer evidence and relying-party context remain separate files.
import {openSync, readSync, closeSync} from 'node:fs';
import {evaluateWire, MAX_BYTES} from './wire.mjs';
if (process.argv.length !== 4) throw new Error('Usage: node check-wire.mjs bundle.json local-context.json');
function readBounded(path) {
  const fd = openSync(path, 'r'), bytes = Buffer.alloc(MAX_BYTES + 1);
  let size = 0;
  try {
    while (size < bytes.length) {
      const count = readSync(fd, bytes, size, bytes.length - size, null);
      if (!count) break;
      size += count;
    }
    return bytes.subarray(0, size);
  } finally { closeSync(fd); }
}
const result = evaluateWire(readBounded(process.argv[2]), readBounded(process.argv[3]));
console.log(JSON.stringify(result, null, 2));
if (result.decision !== 'admit') process.exitCode = 1;

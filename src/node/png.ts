import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import type { Surface } from '../core/surface';

function chunk(type: string, body: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0);
  return Buffer.concat([head, body, crc]);
}

/** Encode a Surface as a PNG (8-bit RGBA). Node only. */
export function encodePNG(s: Surface): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s.w, 0);
  ihdr.writeUInt32BE(s.h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA, deflate, no filter, no interlace
  const stride = s.w * 4;
  const raw = Buffer.alloc((stride + 1) * s.h);
  for (let y = 0; y < s.h; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(s.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/** Write a Surface to a PNG file, creating folders as needed. */
export function writePNG(path: string, s: Surface): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePNG(s));
}

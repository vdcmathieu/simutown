import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Scene } from '../src/core/types';
import { tinyScene } from '../src/fixtures/tiny';
import { hasFfmpeg, planVideo, renderVideo } from '../src/node/video';
import { frameCount, frameIndex } from '../src/player/clock';

const ffmpeg = await hasFfmpeg();

describe('a failed export leaves the destination alone', () => {
  it('keeps an existing file and leaves no partial when ffmpeg is missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'simutown-safe-'));
    const dest = join(dir, 'good.mp4');
    writeFileSync(dest, 'GOOD');
    await expect(renderVideo(tinyScene, dest, { ffmpeg: 'simutown-no-such-ffmpeg', to: 0.2 })).rejects.toThrow();
    expect(readFileSync(dest, 'utf8')).toBe('GOOD');
    expect(readdirSync(dir)).toEqual(['good.mp4']);
  });

  it.skipIf(!ffmpeg)('keeps an existing file and leaves no partial when rendering throws midway', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'simutown-safe-'));
    const dest = join(dir, 'good.mp4');
    writeFileSync(dest, 'GOOD');
    const boom = renderVideo(tinyScene, dest, {
      scale: 1,
      onProgress: (p) => {
        if (p.frame === 5) throw new Error('boom');
      },
    });
    await expect(boom).rejects.toThrow(/boom/);
    expect(readFileSync(dest, 'utf8')).toBe('GOOD');
    expect(readdirSync(dir)).toEqual(['good.mp4']);
  });

  it.skipIf(!ffmpeg)('replaces the destination only once the export succeeds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'simutown-safe-'));
    const dest = join(dir, 'clip.gif');
    writeFileSync(dest, 'OLD');
    await renderVideo(tinyScene, dest, { to: 0.5, scale: 1 });
    expect(readFileSync(dest).subarray(0, 3).toString()).toBe('GIF');
    expect(readdirSync(dir)).toEqual(['clip.gif']);
    expect(existsSync(join(dir, 'clip.partial.gif'))).toBe(false);
  });

  it.skipIf(!ffmpeg)('gives two exports to the same file a partial each', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'simutown-safe-'));
    const dest = join(dir, 'clip.gif');
    const seen = new Set<string>();
    const look = () => {
      for (const f of readdirSync(dir)) if (f.includes('.partial')) seen.add(f);
    };
    const one = { to: 0.5, scale: 1, onProgress: look };
    await Promise.all([renderVideo(tinyScene, dest, one), renderVideo(tinyScene, dest, one)]);
    expect(seen.size).toBe(2);
    expect([...seen].every((f) => /^clip\.partial-\d+-\d+\.gif$/.test(f))).toBe(true);
    expect(readFileSync(dest).subarray(0, 3).toString()).toBe('GIF');
    expect(readdirSync(dir)).toEqual(['clip.gif']);
  });
});

describe('export and playback agree on the frame count', () => {
  for (const duration of [1.01, 8, 0.5, 2.999]) {
    it(`a ${duration} s scene`, () => {
      const scene: Scene = { ...tinyScene, duration };
      const exported = planVideo(scene, 'x.mp4', { scale: 1 }).times.length;
      const played = frameIndex(duration, scene.fps, duration) + 1;
      expect(exported).toBe(played);
      expect(exported).toBe(frameCount(duration, scene.fps));
    });
  }
});

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tinyScene } from '../src/fixtures/tiny';
import { ffmpegArgs, formatFromPath, hasFfmpeg, planVideo, renderStill, renderVideo } from '../src/node/video';

const dir = mkdtempSync(join(tmpdir(), 'simutown-video-'));
const ffmpeg = await hasFfmpeg();

describe('planVideo', () => {
  it('defaults to x4 at the scene fps for mp4, x2 at 15 fps for gif', () => {
    const mp4 = planVideo(tinyScene, 'a.mp4');
    expect([mp4.width, mp4.height, mp4.fps, mp4.times.length]).toEqual([1920, 1080, 30, 240]);
    const gif = planVideo(tinyScene, 'a.gif');
    expect([gif.width, gif.height, gif.fps, gif.times.length]).toEqual([960, 540, 15, 120]);
  });

  it('samples [from, to) at the output fps', () => {
    const p = planVideo(tinyScene, 'a.webm', { from: 2, to: 3, fps: 10, scale: 1 });
    expect(p.times).toHaveLength(10);
    expect(p.times[0]).toBe(2);
    expect(p.times.at(-1)).toBeCloseTo(2.9);
  });

  it('rejects bad options with clear messages', () => {
    expect(() => planVideo(tinyScene, 'a.mov')).toThrow(/\.mp4, \.gif, \.webm/);
    expect(() => planVideo(tinyScene, 'a.mp4', { scale: 1.5 })).toThrow(/scale/);
    expect(() => planVideo(tinyScene, 'a.mp4', { to: 99 })).toThrow(/duration/);
    expect(() => planVideo(tinyScene, 'a.mp4', { from: 3, to: 2 })).toThrow(/empty/);
  });

  it('picks the format from the extension, ignoring case', () => {
    expect(formatFromPath('X.GIF')).toBe('gif');
  });
});

describe('ffmpegArgs', () => {
  it('upscales with nearest neighbour and encodes QuickTime-safe H.264', () => {
    const a = ffmpegArgs(planVideo(tinyScene, 'o.mp4'), 480, 270, 'o.mp4').join(' ');
    expect(a).toContain('-f rawvideo -pix_fmt rgba -s 480x270 -r 30');
    expect(a).toContain('flags=neighbor');
    expect(a).toContain('-c:v libx264');
    expect(a).toContain('-pix_fmt yuv420p');
    expect(a).toContain('+faststart');
  });

  it('builds a palette for gif', () => {
    const a = ffmpegArgs(planVideo(tinyScene, 'o.gif'), 480, 270, 'o.gif').join(' ');
    expect(a).toContain('palettegen');
    expect(a).toContain('paletteuse=dither=none');
  });
});

describe('renderVideo', () => {
  it('explains how to install ffmpeg when it is missing', async () => {
    await expect(
      renderVideo(tinyScene, join(dir, 'x.mp4'), { ffmpeg: 'simutown-no-such-ffmpeg', to: 0.1 }),
    ).rejects.toThrow(/ffmpeg was not found[\s\S]*brew install ffmpeg/);
  });

  it.skipIf(!ffmpeg)('writes a gif and an mp4 with the expected frames', async () => {
    const seen: number[] = [];
    const gif = await renderVideo(tinyScene, join(dir, 'a.gif'), { from: 1, to: 2, onProgress: (p) => seen.push(p.frame) });
    expect(gif.frames).toBe(15);
    expect(seen.at(-1)).toBe(15);
    const mp4 = await renderVideo(tinyScene, join(dir, 'a.mp4'), { from: 0, to: 1, scale: 1 });
    const probe = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,width,height,pix_fmt,nb_read_frames', '-of', 'json', mp4.path], { encoding: 'utf8' });
    expect(JSON.parse(probe).streams[0]).toMatchObject({
      codec_name: 'h264', width: 480, height: 270, pix_fmt: 'yuv420p', nb_read_frames: '30',
    });
  });
});

describe('renderStill', () => {
  it('writes an upscaled PNG without ffmpeg', () => {
    const r = renderStill(tinyScene, 4, join(dir, 's.png'), { scale: 2 });
    const png = readFileSync(r.path);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([960, 540]);
  });

  it('rejects times outside the scene', () => {
    expect(() => renderStill(tinyScene, 9, join(dir, 's.png'))).toThrow(/between 0/);
  });
});

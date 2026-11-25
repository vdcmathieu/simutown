/** Small command-line helpers shared by the render tools (`still`, `render-preview`, `render-bench`). */

/** Parse "19.5" or "19:30" into an hour of the day. */
export function parseHour(text: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text);
  const hour = m ? Number(m[1]) + Number(m[2]) / 60 : Number(text);
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) throw new Error(`bad time of day "${text}": use 0..24 or HH:MM`);
  return hour;
}

/** "1930" for 19.5: used in file names. */
export function hourTag(hour: number): string {
  const minutes = Math.round(hour * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}`;
}

/** The four hours every mood is reviewed at: daylight, golden hour, dusk, night. */
export const REVIEW_HOURS = [12, 18, 19.5, 23] as const;

/** Take `--name value` out of an argument list and return the value, or undefined. */
export function takeOption(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args.splice(i, 2)[1];
  if (value === undefined) throw new Error(`${name} needs a value`);
  return value;
}

/** Take a bare `--name` out of an argument list and say whether it was there. */
export function takeFlag(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
}

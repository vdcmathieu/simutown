/** Reports a problem once per key, so a missing sprite does not flood the console at 30 fps. */
export type WarnOnce = (key: string, message: string) => void;

/** Build a warn-once function that forwards each distinct key to `sink` a single time. */
export function createWarner(sink: (message: string) => void): WarnOnce {
  const seen = new Set<string>();
  return (key, message) => {
    if (seen.has(key)) return;
    seen.add(key);
    sink(`simutown render: ${message}`);
  };
}

/** "a, b, c" for warning messages. */
export function listNames(names: Iterable<string>): string {
  const all = [...names].sort();
  return all.length > 0 ? all.join(', ') : '(none)';
}

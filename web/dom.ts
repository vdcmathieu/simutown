/** A tiny element builder, so views read like the markup they make. */

type Child = Node | string | null | undefined | false | Child[];

/** Create an element. `undefined` attributes are skipped; children may be nested arrays. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== '') e.setAttribute(k, v);
  const add = (c: Child): void => {
    if (Array.isArray(c)) c.forEach(add);
    else if (c instanceof Node) e.append(c);
    else if (typeof c === 'string') e.append(c);
  };
  children.forEach(add);
  return e;
}

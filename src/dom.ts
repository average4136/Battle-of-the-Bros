// A tiny helper for building page elements in code.
//
// Why not build HTML strings and set innerHTML? Some text here is typed by
// users (custom game names, usernames). Pasting that into innerHTML would let
// someone inject HTML or scripts (XSS). h() sets text with textContent, which
// always treats it as plain text.
//
// Usage: h('a', { href: '/x' }, 'click me')  →  <a href="/x">click me</a>

type Child = Node | string | number | null | undefined | false;
type Props = Record<string, string | number | boolean | EventListener | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      // { onclick: fn } → addEventListener('click', fn)
      el.addEventListener(key.slice(2), value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  mount(el, ...children);
  return el;
}

/** Visible note for things that wait on an open design question. */
export function openNote(question: string): HTMLElement {
  return h('p', {}, h('strong', {}, `[OPEN: ${question}]`));
}

/** Visible note for a feature that's faked in this prototype. */
export function placeholder(text: string): HTMLElement {
  return h('p', {}, h('em', {}, `[Placeholder: ${text}]`));
}

/** Like parent.append(), but skips null/false, so `cond ? el : null` works inline. */
export function mount(parent: HTMLElement, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : String(child));
  }
}

/** The element each page's script fills in. Every page has <div id="app">. */
export function appRoot(): HTMLElement {
  const root = document.getElementById('app');
  if (!root) throw new Error('Page is missing <div id="app">');
  return root;
}

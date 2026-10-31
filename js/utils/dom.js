// utils/dom.js
export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
export function icon(name, size = 18) {
  const i = document.createElement('i');
  i.setAttribute('data-lucide', name);
  i.style.width = size + 'px';
  i.style.height = size + 'px';
  return i;
}
export function refreshIcons(root = document) {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons({ root });
  }
}

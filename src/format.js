export const F = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const initials = (name) =>
  (name || '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const TINTS = [
  ['#e3f2fd', '#1565c0'],
  ['#e8f5e9', '#2e7d32'],
  ['#fff3e0', '#e65100'],
  ['#f3e5f5', '#7b1fa2'],
  ['#e1f5fe', '#0277bd'],
];

export const tint = (i) => TINTS[i % TINTS.length];

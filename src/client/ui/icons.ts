// Small inline SVG icon set (stroke icons, 24x24 viewBox).
const PATHS: Record<string, string> = {
  maze: 'M3 3h18v18H3zM7 3v10M11 7v14M15 3v10M19 7v10M7 17h4',
  arrows: 'M4 8h13l-3-3M20 16H7l3 3',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.8 2.8 2.6 3 5.2',
  heart: 'M12 20s-7.5-4.4-9.2-9.1C1.6 7.4 4 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.1 0 5.5 2.9 4.3 6.4C19.5 15.6 12 20 12 20z',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.8 2.5 1.8-1 1.5-2.5 1.8-2.5.8-2.5 1.8 1.1 1.8 2.5 1.8 2.5-.7 2.5-1.7',
  log: 'M4 15l12-8 4 3-12 8zM4 15l4 3M9 9l3 2',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8v.5M12 17.2v.1',
  copy: 'M8 8h11v13H8zM5 16H4V3h11v1',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z',
  bot: 'M5 9h14v10H5zM12 5v4M9 13v1M15 13v1M9 17h6M3 13h2M19 13h2',
  exit: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12',
  play: 'M7 4l13 8-13 8z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  fast: 'M3 5l9 7-9 7zM12 5l9 7-9 7z',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  sword: 'M14.5 3H21v6.5L10 20.5l-3.5-3.5zM4 16l4 4M3 21l3-3',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  arrow: 'M5 19L19 5M19 5h-6M19 5v6M5 19v-4M5 19h4',
  hammer: 'M13 3l8 8-3 3-8-8zM11.5 9.5L4 17l3 3 7.5-7.5',
  flame: 'M12 21c-4 0-7-2.8-7-6.5 0-3.8 3.2-5.6 4-9.5 2.6 1.6 3.4 4 3.4 5.5 1-1 1.6-2.3 1.6-3.5 2.6 2 4 4.6 4 7.5 0 3.7-3 6.5-6 6.5z',
  gem: 'M7 4h10l4 5-9 11L3 9zM3 9h18M12 20L9 9l3-5 3 5z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v4M12 18v4M2 12h4M18 12h4',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  snow: 'M12 2v20M3.5 7l17 10M3.5 17l17-10M9 3.5l3 2 3-2M9 20.5l3-2 3 2',
  skull: 'M12 3a8 8 0 0 0-8 8c0 2.6 1.3 4.6 3 5.8V21h10v-4.2c1.7-1.2 3-3.2 3-5.8a8 8 0 0 0-8-8zM9 12h.01M15 12h.01M10.5 21v-2M13.5 21v-2',
  crystal: 'M12 2l5 6-5 14-5-14zM7 8h10',
  chest: 'M3 10h18v10H3zM3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4M11 12h2v3h-2z',
  scroll: 'M8 4h10a2 2 0 0 1 2 2v1h-4M8 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M8 4a2 2 0 0 1 2 2v12M11 10h4M11 14h4',
  brick: 'M3 5h18v14H3zM3 12h18M9 5v7M15 12v7',
  tree: 'M12 2l6 8h-3l4 6H5l4-6H6zM12 16v6',
  banner: 'M6 21V3M6 4h12l-3 4 3 4H6',
  wing: 'M3 18c4 0 7-2 9-6 1-2 3-6 9-7-1 6-4 11-9 13-3 1.2-6 .8-9 0zM8 15.5c2-1 4-3 5-5.5',
  rune: 'M8 2.5h8l4 9.5-8 9.5-8-9.5zM10.5 7v10M10.5 8l3.5 2.5M10.5 12l3.5 2.5',
  check: 'M5 12.5l4.5 4.5L19 7',
  reset: 'M4 4v6h6M4.6 15a8 8 0 1 0 1.8-8.4L4 10',
  back: 'M15 5l-7 7 7 7',
  infinity: 'M12 12c-2-2.7-3.7-4-5.5-4a4 4 0 0 0 0 8c1.8 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.7 4 5.5 4a4 4 0 0 0 0-8c-1.8 0-3.5 1.3-5.5 4z',
};

export function icon(name: string, size = 18, extra = ''): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (extra) svg.setAttribute('class', extra);
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', PATHS[name] ?? PATHS.star);
  svg.appendChild(p);
  return svg;
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function formatXp(bytes, options = {}) {
  const value = Number(bytes) || 0;
  const absolute = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absolute < 1000) {
    return `${sign}${absolute.toFixed(absolute % 1 === 0 ? 0 : 1)} B`;
  }

  const kb = absolute / 1000;
  const decimals = options.compact ? (kb >= 100 ? 0 : 1) : (kb >= 100 ? 0 : 2);
  return `${sign}${kb.toFixed(decimals)} kB`;
}

function formatProjectName(path, fallback) {
  if (!path) return fallback || 'Unknown project';

  const parts = String(path).replace(/\/$/, '').split('/').filter(Boolean);
  const rawName = parts[parts.length - 1] || fallback || 'Unknown project';

  return rawName
    .replace(/^project[-_]/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isProjectXp(row) {
  const path = String(row.path || '').toLowerCase();

  // Reboot's XP board includes tiny exam exercise XP, but the requested chart is
  // "XP added per project", so the chart keeps projects/repositories and removes exercises.
  if (path.includes('/exercise/') || path.includes('exercise-') || path.includes('/exam/')) {
    return false;
  }

  return true;
}

function buildXpByProject(transactions) {
  const projects = new Map();

  if (!Array.isArray(transactions)) return [];

  transactions.filter(isProjectXp).forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (amount === 0) return;

    const key = tx.objectId || tx.path || tx.id;
    const current = projects.get(key) || {
      name: formatProjectName(tx.path, `Project ${tx.objectId || tx.id}`),
      path: tx.path || '',
      xp: 0,
    };

    // Important: keep negative XP correction rows. Reboot shows them in the XP board
    // and they should cancel the previous award instead of being ignored.
    current.xp += amount;
    projects.set(key, current);
  });

  return [...projects.values()]
    .filter((project) => project.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 12);
}

function addNoDataMessage(svg, width, height, message) {
  const text = createSvgElement('text', {
    x: width / 2,
    y: height / 2,
    'text-anchor': 'middle',
    'font-size': '18',
    class: 'chart-empty',
  });
  text.textContent = message;
  svg.appendChild(text);
}

function renderXpByProjectGraph(projects) {
  const svg = document.getElementById('xp-project-graph');
  if (!svg) return;

  clearSvg(svg);

  const width = 900;
  const height = 420;
  const left = 205;
  const right = 65;
  const top = 28;
  const barHeight = 23;
  const gap = 10;
  const usableWidth = width - left - right;

  if (!projects || projects.length === 0) {
    addNoDataMessage(svg, width, height, 'No project XP data found');
    return;
  }

  const maxXp = Math.max(...projects.map((project) => project.xp), 1);

  projects.forEach((project, index) => {
    const y = top + index * (barHeight + gap);
    const barWidth = Math.max((project.xp / maxXp) * usableWidth, 4);

    const label = createSvgElement('text', {
      x: left - 14,
      y: y + 16,
      'text-anchor': 'end',
      class: 'chart-label',
    });
    label.textContent = project.name.length > 25 ? `${project.name.slice(0, 25)}...` : project.name;
    svg.appendChild(label);

    svg.appendChild(createSvgElement('rect', {
      x: left,
      y,
      width: usableWidth,
      height: barHeight,
      rx: 12,
      class: 'chart-track',
    }));

    const bar = createSvgElement('rect', {
      x: left,
      y,
      width: barWidth,
      height: barHeight,
      rx: 12,
      class: 'chart-bar',
    });

    const title = createSvgElement('title');
    title.textContent = `${project.path || project.name}: ${formatXp(project.xp)}`;
    bar.appendChild(title);
    svg.appendChild(bar);

    const value = createSvgElement('text', {
      x: left + Math.min(barWidth + 12, usableWidth - 85),
      y: y + 16,
      class: 'chart-value',
    });
    value.textContent = formatXp(project.xp, { compact: true });
    svg.appendChild(value);
  });
}

function renderAuditRatioGraph(data) {
  const svg = document.getElementById('audit-ratio-graph');
  if (!svg) return;

  clearSvg(svg);

  const width = 520;
  const height = 420;
  const centerX = width / 2;
  const centerY = 178;
  const radius = 108;
  const up = Number(data.up) || 0;
  const down = Number(data.down) || 0;
  const total = up + down;

  if (total <= 0) {
    addNoDataMessage(svg, width, height, 'No audit data found');
    return;
  }

  const circumference = 2 * Math.PI * radius;
  const doneFraction = up / total;

  svg.appendChild(createSvgElement('circle', {
    cx: centerX,
    cy: centerY,
    r: radius,
    class: 'donut-track',
  }));

  svg.appendChild(createSvgElement('circle', {
    cx: centerX,
    cy: centerY,
    r: radius,
    class: 'donut-progress',
    'stroke-dasharray': `${circumference * doneFraction} ${circumference}`,
    transform: `rotate(-90 ${centerX} ${centerY})`,
  }));

  const ratio = createSvgElement('text', {
    x: centerX,
    y: centerY - 2,
    'text-anchor': 'middle',
    class: 'donut-number',
  });
  ratio.textContent = Number(data.ratio || 0).toFixed(2);
  svg.appendChild(ratio);

  const label = createSvgElement('text', {
    x: centerX,
    y: centerY + 30,
    'text-anchor': 'middle',
    class: 'donut-label',
  });
  label.textContent = 'audit ratio';
  svg.appendChild(label);

  const done = createSvgElement('text', {
    x: centerX - 105,
    y: 350,
    'text-anchor': 'middle',
    class: 'chart-label',
  });
  done.textContent = `Done: ${formatXp(up, { compact: true })}`;
  svg.appendChild(done);

  const received = createSvgElement('text', {
    x: centerX + 105,
    y: 350,
    'text-anchor': 'middle',
    class: 'chart-label',
  });
  received.textContent = `Received: ${formatXp(down, { compact: true })}`;
  svg.appendChild(received);
}

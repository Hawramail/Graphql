function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

function formatProjectName(path, fallback) {
  if (!path) return fallback || 'Unknown project';

  const parts = String(path).replace(/\/$/, '').split('/').filter(Boolean);
  const rawName = parts[parts.length - 1] || fallback || 'Unknown project';

  return rawName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildXpByProject(transactions) {
  const projects = new Map();

  if (!Array.isArray(transactions)) return [];

  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return;

    const key = tx.objectId || tx.path || tx.id;
    const current = projects.get(key) || {
      name: formatProjectName(tx.path, `Project ${tx.objectId || tx.id}`),
      path: tx.path || '',
      xp: 0,
    };

    current.xp += amount;
    projects.set(key, current);
  });

  return [...projects.values()].sort((a, b) => b.xp - a.xp).slice(0, 12);
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
  const left = 190;
  const right = 55;
  const top = 28;
  const barHeight = 23;
  const gap = 10;
  const usableWidth = width - left - right;

  if (!projects || projects.length === 0) {
    addNoDataMessage(svg, width, height, 'No XP project data found');
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
    label.textContent = project.name.length > 24 ? `${project.name.slice(0, 24)}...` : project.name;
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
    title.textContent = `${project.path || project.name}: ${project.xp.toLocaleString()} XP`;
    bar.appendChild(title);
    svg.appendChild(bar);

    const value = createSvgElement('text', {
      x: left + Math.min(barWidth + 12, usableWidth - 80),
      y: y + 16,
      class: 'chart-value',
    });
    value.textContent = project.xp.toLocaleString();
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
  const total = data.up + data.down;

  if (total <= 0) {
    addNoDataMessage(svg, width, height, 'No audit data found');
    return;
  }

  const circumference = 2 * Math.PI * radius;
  const doneFraction = data.up / total;

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
  ratio.textContent = data.ratio.toFixed(2);
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
  done.textContent = `Done: ${data.up.toLocaleString()}`;
  svg.appendChild(done);

  const received = createSvgElement('text', {
    x: centerX + 105,
    y: 350,
    'text-anchor': 'middle',
    class: 'chart-label',
  });
  received.textContent = `Received: ${data.down.toLocaleString()}`;
  svg.appendChild(received);
}

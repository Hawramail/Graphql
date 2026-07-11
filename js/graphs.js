function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);

  for (const key in attrs) {
    el.setAttribute(key, attrs[key]);
  }

  return el;
}

function clearSvg(svg) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

function getProjectName(path) {
  if (!path) return 'Unknown project';

  const cleanPath = String(path).replace(/\/$/, '');
  const parts = cleanPath.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1] || cleanPath;

  return lastPart
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildXpByProject(transactions) {
  if (!Array.isArray(transactions)) return [];

  const projects = new Map();

  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return;

    const key = tx.objectId || tx.path || tx.id;
    const current = projects.get(key) || {
      name: getProjectName(tx.path),
      path: tx.path || '',
      xp: 0,
    };

    current.xp += amount;
    projects.set(key, current);
  });

  return [...projects.values()].sort((a, b) => b.xp - a.xp).slice(0, 12);
}

function computeAuditRatio(auditRows) {
  let up = 0;
  let down = 0;

  if (Array.isArray(auditRows)) {
    auditRows.forEach((row) => {
      const amount = Math.abs(Number(row.amount) || 0);

      if (row.type === 'up') {
        up += amount;
      } else if (row.type === 'down') {
        down += amount;
      }
    });
  }

  return {
    up,
    down,
    ratio: down === 0 ? (up > 0 ? up : 0) : up / down,
  };
}

function addNoDataMessage(svg, width, height, message) {
  const text = createSvgElement('text', {
    x: width / 2,
    y: height / 2,
    'text-anchor': 'middle',
    'font-size': '18',
    fill: 'currentColor',
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
  const left = 180;
  const right = 48;
  const top = 28;
  const barHeight = 22;
  const gap = 10;

  if (!projects || projects.length === 0) {
    addNoDataMessage(svg, width, height, 'No project XP data available');
    return;
  }

  const maxXp = Math.max(...projects.map((project) => project.xp), 1);
  const usableWidth = width - left - right;

  projects.forEach((project, index) => {
    const y = top + index * (barHeight + gap);
    const barWidth = (project.xp / maxXp) * usableWidth;

    const label = createSvgElement('text', {
      x: left - 14,
      y: y + barHeight / 2 + 5,
      'text-anchor': 'end',
      'font-size': '13',
      fill: 'currentColor',
    });
    label.textContent = project.name.length > 22 ? `${project.name.slice(0, 22)}...` : project.name;
    svg.appendChild(label);

    const track = createSvgElement('rect', {
      x: left,
      y,
      width: usableWidth,
      height: barHeight,
      rx: 11,
      class: 'chart-track',
    });
    svg.appendChild(track);

    const bar = createSvgElement('rect', {
      x: left,
      y,
      width: Math.max(barWidth, 4),
      height: barHeight,
      rx: 11,
      class: 'chart-bar',
    });

    const title = createSvgElement('title');
    title.textContent = `${project.path || project.name}: ${project.xp.toLocaleString()} XP`;
    bar.appendChild(title);
    svg.appendChild(bar);

    const value = createSvgElement('text', {
      x: left + Math.min(barWidth + 12, usableWidth - 80),
      y: y + barHeight / 2 + 5,
      'font-size': '12',
      fill: 'currentColor',
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
  const centerY = 185;
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const total = data.up + data.down;
  const upFraction = total === 0 ? 0 : data.up / total;

  if (total === 0) {
    addNoDataMessage(svg, width, height, 'No audit data available');
    return;
  }

  const background = createSvgElement('circle', {
    cx: centerX,
    cy: centerY,
    r: radius,
    fill: 'none',
    class: 'donut-track',
  });
  svg.appendChild(background);

  const progress = createSvgElement('circle', {
    cx: centerX,
    cy: centerY,
    r: radius,
    fill: 'none',
    class: 'donut-progress',
    'stroke-dasharray': `${circumference * upFraction} ${circumference}`,
    transform: `rotate(-90 ${centerX} ${centerY})`,
  });
  svg.appendChild(progress);

  const ratioText = createSvgElement('text', {
    x: centerX,
    y: centerY - 4,
    'text-anchor': 'middle',
    'font-size': '44',
    'font-weight': '800',
    fill: 'currentColor',
  });
  ratioText.textContent = data.ratio.toFixed(2);
  svg.appendChild(ratioText);

  const ratioLabel = createSvgElement('text', {
    x: centerX,
    y: centerY + 28,
    'text-anchor': 'middle',
    'font-size': '13',
    fill: 'currentColor',
  });
  ratioLabel.textContent = 'audit ratio';
  svg.appendChild(ratioLabel);

  const upLabel = createSvgElement('text', {
    x: centerX - 95,
    y: 355,
    'text-anchor': 'middle',
    'font-size': '14',
    fill: 'currentColor',
  });
  upLabel.textContent = `Done: ${data.up.toLocaleString()}`;
  svg.appendChild(upLabel);

  const downLabel = createSvgElement('text', {
    x: centerX + 95,
    y: 355,
    'text-anchor': 'middle',
    'font-size': '14',
    fill: 'currentColor',
  });
  downLabel.textContent = `Received: ${data.down.toLocaleString()}`;
  svg.appendChild(downLabel);
}

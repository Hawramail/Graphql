function buildXpOverTime(transactions) {
  if (!Array.isArray(transactions)) return [];

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  let runningTotal = 0;

  return sorted.map((tx) => {
    runningTotal += Number(tx.amount) || 0;
    return {
      date: new Date(tx.createdAt),
      totalXp: runningTotal,
      amount: Number(tx.amount) || 0,
      path: tx.path || '',
    };
  });
}

function computePassFail(progressRows) {
  let pass = 0;
  let fail = 0;

  if (!Array.isArray(progressRows)) {
    return { pass, fail };
  }

  for (const row of progressRows) {
    const grade = Number(row.grade);

    if (grade === 1) {
      pass++;
    } else if (grade === 0) {
      fail++;
    }
  }

  return { pass, fail };
}

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

function renderXpGraph(points) {
  const svg = document.getElementById('xp-graph');
  if (!svg) return;

  clearSvg(svg);

  const width = 700;
  const height = 260;
  const padding = 40;

  if (!points || points.length === 0) {
    const text = createSvgElement('text', {
      x: width / 2,
      y: height / 2,
      'text-anchor': 'middle',
      'font-size': '16',
      fill: '#666',
    });
    text.textContent = 'No XP data available';
    svg.appendChild(text);
    return;
  }

  const minX = points[0].date.getTime();
  const maxX = points[points.length - 1].date.getTime();
  const maxY = Math.max(...points.map((p) => p.totalXp), 1);

  const scaleX = (value) => {
    if (maxX === minX) return width / 2;
    return padding + ((value - minX) / (maxX - minX)) * (width - padding * 2);
  };

  const scaleY = (value) => {
    return height - padding - (value / maxY) * (height - padding * 2);
  };

  svg.appendChild(
    createSvgElement('line', {
      x1: padding,
      y1: height - padding,
      x2: width - padding,
      y2: height - padding,
      stroke: '#999',
      'stroke-width': '1',
    })
  );

  svg.appendChild(
    createSvgElement('line', {
      x1: padding,
      y1: padding,
      x2: padding,
      y2: height - padding,
      stroke: '#999',
      'stroke-width': '1',
    })
  );

  for (let i = 0; i <= 4; i++) {
    const yValue = (maxY / 4) * i;
    const y = scaleY(yValue);

    svg.appendChild(
      createSvgElement('line', {
        x1: padding,
        y1: y,
        x2: width - padding,
        y2: y,
        stroke: '#eee',
        'stroke-width': '1',
      })
    );

    const label = createSvgElement('text', {
      x: padding - 8,
      y: y + 4,
      'text-anchor': 'end',
      'font-size': '11',
      fill: '#666',
    });
    label.textContent = Math.round(yValue);
    svg.appendChild(label);
  }

  let pathData = '';

  points.forEach((point, index) => {
    const x = scaleX(point.date.getTime());
    const y = scaleY(point.totalXp);

    pathData += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  const path = createSvgElement('path', {
    d: pathData,
    fill: 'none',
    stroke: '#2563eb',
    'stroke-width': '3',
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  });

  svg.appendChild(path);

  points.forEach((point) => {
    const x = scaleX(point.date.getTime());
    const y = scaleY(point.totalXp);

    const circle = createSvgElement('circle', {
      cx: x,
      cy: y,
      r: 4,
      fill: '#2563eb',
    });

    const title = createSvgElement('title');
    title.textContent = `${point.path} | +${point.amount} XP | Total: ${point.totalXp} XP`;
    circle.appendChild(title);

    svg.appendChild(circle);
  });

  const xLabel = createSvgElement('text', {
    x: width / 2,
    y: height - 8,
    'text-anchor': 'middle',
    'font-size': '12',
    fill: '#666',
  });
  xLabel.textContent = 'Time';
  svg.appendChild(xLabel);

  const yLabel = createSvgElement('text', {
    x: 16,
    y: height / 2,
    'text-anchor': 'middle',
    'font-size': '12',
    fill: '#666',
    transform: `rotate(-90 16 ${height / 2})`,
  });
  yLabel.textContent = 'Total XP';
  svg.appendChild(yLabel);
}

function renderPassFailGraph(data) {
  const svg = document.getElementById('passfail-graph');
  if (!svg) return;

  clearSvg(svg);

  const width = 420;
  const height = 260;
  const padding = 40;

  const pass = Number(data.pass) || 0;
  const fail = Number(data.fail) || 0;
  const maxValue = Math.max(pass, fail, 1);

  svg.appendChild(
    createSvgElement('line', {
      x1: padding,
      y1: height - padding,
      x2: width - padding,
      y2: height - padding,
      stroke: '#999',
      'stroke-width': '1',
    })
  );

  svg.appendChild(
    createSvgElement('line', {
      x1: padding,
      y1: padding,
      x2: padding,
      y2: height - padding,
      stroke: '#999',
      'stroke-width': '1',
    })
  );

  const bars = [
    { label: 'PASS', value: pass, color: '#16a34a', x: 100 },
    { label: 'FAIL', value: fail, color: '#dc2626', x: 240 },
  ];

  const barWidth = 80;
  const usableHeight = height - padding * 2;

  bars.forEach((bar) => {
    const barHeight = (bar.value / maxValue) * usableHeight;
    const y = height - padding - barHeight;

    const rect = createSvgElement('rect', {
      x: bar.x,
      y,
      width: barWidth,
      height: barHeight,
      rx: 8,
      fill: bar.color,
    });

    const rectTitle = createSvgElement('title');
    rectTitle.textContent = `${bar.label}: ${bar.value}`;
    rect.appendChild(rectTitle);

    svg.appendChild(rect);

    const valueText = createSvgElement('text', {
      x: bar.x + barWidth / 2,
      y: y - 8,
      'text-anchor': 'middle',
      'font-size': '14',
      fill: '#222',
    });
    valueText.textContent = String(bar.value);
    svg.appendChild(valueText);

    const labelText = createSvgElement('text', {
      x: bar.x + barWidth / 2,
      y: height - padding + 20,
      'text-anchor': 'middle',
      'font-size': '13',
      fill: '#444',
    });
    labelText.textContent = bar.label;
    svg.appendChild(labelText);
  });

  for (let i = 0; i <= 4; i++) {
    const value = (maxValue / 4) * i;
    const y = height - padding - (value / maxValue) * usableHeight;

    svg.appendChild(
      createSvgElement('line', {
        x1: padding,
        y1: y,
        x2: width - padding,
        y2: y,
        stroke: '#eee',
        'stroke-width': '1',
      })
    );

    const label = createSvgElement('text', {
      x: padding - 8,
      y: y + 4,
      'text-anchor': 'end',
      'font-size': '11',
      fill: '#666',
    });
    label.textContent = Math.round(value);
    svg.appendChild(label);
  }
}
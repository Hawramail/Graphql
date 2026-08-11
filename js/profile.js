document.addEventListener('DOMContentLoaded', () => {
  const jwt = localStorage.getItem('jwt');

  if (!jwt) {
    window.location.replace('index.html');
    return;
  }

  const logoutBtn =
    document.getElementById('logout-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('jwt');
      window.location.replace('index.html');
    });
  }

  loadProfile();
});


async function loadProfile() {
  try {
    const data = await fetchAllData();

    const user =
      data.user && data.user[0];

    if (!user) {
      throw new Error('No user data returned.');
    }


    /*
      -------------------------------------------
      PROJECTS
      -------------------------------------------
    */

    const projects =
      (data.projects || []).filter(project => {
        if (!project.path) {
          return false;
        }

        const path =
          project.path.toLowerCase();

        return (
          path.startsWith('/bahrain/bh-module') &&
          !path.includes('piscine') &&
          !path.includes('onboarding') &&
          !path.includes('exam')
        );
      });


    /*
      -------------------------------------------
      XP FOR GRAPH
      -------------------------------------------

      This filter is for the XP timeline only.
    */

    const graphXp =
      (user.transactions || []).filter(tx => {
        if (!tx.type) {
          return false;
        }

        if (tx.type.toLowerCase() !== 'xp') {
          return false;
        }

        if (!tx.path) {
          return false;
        }

        const path =
          tx.path.toLowerCase();

        return (
          path.startsWith('/bahrain/bh-module') &&
          !path.includes('piscine') &&
          !path.includes('onboarding') &&
          !path.includes('exam')
        );
      });


    /*
      -------------------------------------------
      TOTAL XP
      -------------------------------------------

      IMPORTANT:

      This matches your friend's successful logic.

      Keep Bahrain module XP.

      Exclude only individual piscine-js exercise
      transactions.

      Do NOT calculate total XP from graphXp.
    */

    const totalXp =
      (user.transactions || [])

        .filter(tx => {
          if (!tx.type) {
            return false;
          }

          if (tx.type.toLowerCase() !== 'xp') {
            return false;
          }

          if (!tx.path) {
            return false;
          }

          const path =
            tx.path.toLowerCase();


          if (
            !path.startsWith('/bahrain/bh-module')
          ) {
            return false;
          }


          if (
            path.startsWith(
              '/bahrain/bh-module/piscine-js/'
            )
          ) {
            return false;
          }


          return true;
        })

        .reduce((sum, tx) => {
          return (
            sum +
            (Number(tx.amount) || 0)
          );
        }, 0);


    /*
      -------------------------------------------
      PASS / FAIL
      -------------------------------------------

      Count unique project paths.
    */

    const passedPaths = {};
    const failedPaths = {};


    projects.forEach(project => {
      if (!project.path) {
        return;
      }

      const grade =
        Number(project.grade);

      if (grade > 0) {
        passedPaths[project.path] = true;
      }

      else if (grade === 0) {
        failedPaths[project.path] = true;
      }
    });


    const passCount =
      Object.keys(passedPaths).length;

    const failCount =
      Object.keys(failedPaths).length;


    /*
      -------------------------------------------
      LEVEL
      -------------------------------------------
    */

    const level =
      user.level && user.level[0]
        ? user.level[0].amount
        : 0;


    /*
      -------------------------------------------
      AUDIT RATIO
      -------------------------------------------
    */

    const auditUp =
      Number(user.totalUp) || 0;

    const auditDown =
      Number(user.totalDown) || 0;

    const auditRatio =
      auditDown > 0
        ? (auditUp / auditDown).toFixed(1)
        : 'N/A';


    /*
      -------------------------------------------
      DISPLAY
      -------------------------------------------
    */

    setText('user-login', user.login);
    setText('user-login-card', user.login);
    setText('user-id', user.id);

    setText('user-level', level);

    setText(
      'total-xp',
      fmtXP(totalXp)
    );

    setText(
      'pass-count',
      passCount
    );

    setText(
      'fail-count',
      failCount
    );

    setText(
      'total-attempts',
      passCount + failCount
    );

    setText(
      'audit-ratio',
      auditRatio
    );

    setText(
      'xp-up',
      fmtXP(auditUp)
    );

    setText(
      'xp-down',
      fmtXP(auditDown)
    );


    /*
      Count unique project paths that generated XP
    */

    const xpProjectPaths =
      new Set(
        graphXp
          .map(tx => tx.path)
          .filter(Boolean)
      );

    setText(
      'xp-projects',
      xpProjectPaths.size
    );


    /*
      -------------------------------------------
      OTHER UI
      -------------------------------------------
    */

    renderRecentResults(
      data.results || []
    );

    drawXpGraph(graphXp);

    drawPassFailGraph(
      passCount,
      failCount
    );


  } catch (error) {
    console.error(
      'Profile loading error:',
      error
    );

    const errorEl =
      document.getElementById(
        'global-error'
      );

    if (errorEl) {
      errorEl.textContent =
        error.message ||
        'Failed to load profile.';
    }
  }
}


/*
  ==================================================
  SIMPLE TEXT HELPER
  ==================================================
*/

function setText(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      value ?? '-';
  }
}


/*
  ==================================================
  XP FORMATTER
  ==================================================

  Raw GraphQL value:
      125000

  Display:
      125 kB

  This matches your friend's formatter.
*/

function fmtXP(n) {
  n = Number(n) || 0;

  if (n >= 1000000) {
    return (
      (n / 1000000).toFixed(2)
      + ' MB'
    );
  }

  if (n >= 1000) {
    return (
      Math.round(n / 1000)
      + ' kB'
    );
  }

  return n + ' B';
}


/*
  ==================================================
  RECENT RESULTS
  ==================================================
*/

function renderRecentResults(results) {
  const list =
    document.getElementById(
      'recent-results-list'
    );

  if (!list) {
    return;
  }

  list.innerHTML = '';

  if (!results.length) {
    const li =
      document.createElement('li');

    li.textContent =
      'No recent results found.';

    list.appendChild(li);

    return;
  }


  results.forEach(result => {
    const li =
      document.createElement('li');

    const grade =
      Number(result.grade);

    const status =
      grade > 0
        ? 'PASS'
        : grade === 0
          ? 'FAIL'
          : 'N/A';

    const date =
      result.createdAt
        ? new Date(
            result.createdAt
          ).toLocaleDateString()
        : 'Unknown date';

    li.textContent =
      `${status} - ${
        result.path || 'Unknown'
      } - ${date}`;

    list.appendChild(li);
  });
}


/*
  ==================================================
  XP GRAPH
  ==================================================
*/

function drawXpGraph(transactions) {
  const svg =
    document.getElementById(
      'xp-graph'
    );

  if (!svg) {
    return;
  }

  svg.innerHTML = '';

  const width = 700;
  const height = 260;
  const padding = 40;


  if (!transactions.length) {
    svg.innerHTML = `
      <text
        x="350"
        y="130"
        text-anchor="middle"
        fill="#666"
      >
        No XP data
      </text>
    `;

    return;
  }


  const sorted =
    [...transactions].sort(
      (a, b) =>
        new Date(a.createdAt)
        -
        new Date(b.createdAt)
    );


  let cumulativeXp = 0;


  const points =
    sorted.map(tx => {
      const amount =
        Number(tx.amount) || 0;

      cumulativeXp += amount;

      return {
        date:
          new Date(tx.createdAt),

        amount,

        total:
          cumulativeXp,

        path:
          tx.path || ''
      };
    });


  const minDate =
    points[0].date.getTime();

  const maxDate =
    points[
      points.length - 1
    ].date.getTime();

  const maxXp =
    Math.max(
      ...points.map(
        point => point.total
      ),
      1
    );


  const scaleX = date => {
    return (
      padding +
      (
        (
          date.getTime()
          -
          minDate
        )
        /
        (
          maxDate
          -
          minDate
          || 1
        )
      )
      *
      (
        width
        -
        padding * 2
      )
    );
  };


  const scaleY = xp => {
    return (
      height
      -
      padding
      -
      (
        xp / maxXp
      )
      *
      (
        height
        -
        padding * 2
      )
    );
  };


  /*
    Axes
  */

  svg.innerHTML += `
    <line
      x1="${padding}"
      y1="${height - padding}"
      x2="${width - padding}"
      y2="${height - padding}"
      stroke="#999"
    />

    <line
      x1="${padding}"
      y1="${padding}"
      x2="${padding}"
      y2="${height - padding}"
      stroke="#999"
    />
  `;


  /*
    Line
  */

  const pathData =
    points
      .map((point, index) => {
        return `
          ${index === 0 ? 'M' : 'L'}
          ${scaleX(point.date)}
          ${scaleY(point.total)}
        `;
      })
      .join(' ');


  svg.innerHTML += `
    <path
      d="${pathData}"
      fill="none"
      stroke="#2563eb"
      stroke-width="3"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  `;


  /*
    Points
  */

  points.forEach(point => {
    svg.innerHTML += `
      <circle
        cx="${scaleX(point.date)}"
        cy="${scaleY(point.total)}"
        r="4"
        fill="#2563eb"
      >
        <title>
          ${point.path}
          | +${fmtXP(point.amount)}
          | Total: ${fmtXP(point.total)}
        </title>
      </circle>
    `;
  });
}


/*
  ==================================================
  PASS / FAIL GRAPH
  ==================================================
*/

function drawPassFailGraph(
  pass,
  fail
) {
  const svg =
    document.getElementById(
      'passfail-graph'
    );

  if (!svg) {
    return;
  }

  svg.innerHTML = '';

  const width = 420;
  const height = 260;
  const padding = 40;

  const max =
    Math.max(
      pass,
      fail,
      1
    );

  const availableHeight =
    height - padding * 2;


  const passHeight =
    (pass / max)
    *
    availableHeight;

  const failHeight =
    (fail / max)
    *
    availableHeight;


  svg.innerHTML = `

    <line
      x1="${padding}"
      y1="${height - padding}"
      x2="${width - padding}"
      y2="${height - padding}"
      stroke="#999"
    />


    <rect
      x="100"
      y="${height - padding - passHeight}"
      width="80"
      height="${passHeight}"
      rx="8"
      fill="#16a34a"
    />

    <text
      x="140"
      y="${height - padding - passHeight - 8}"
      text-anchor="middle"
      fill="#222"
    >
      ${pass}
    </text>

    <text
      x="140"
      y="${height - padding + 20}"
      text-anchor="middle"
      fill="#444"
    >
      PASS
    </text>


    <rect
      x="240"
      y="${height - padding - failHeight}"
      width="80"
      height="${failHeight}"
      rx="8"
      fill="#dc2626"
    />

    <text
      x="280"
      y="${height - padding - failHeight - 8}"
      text-anchor="middle"
      fill="#222"
    >
      ${fail}
    </text>

    <text
      x="280"
      y="${height - padding + 20}"
      text-anchor="middle"
      fill="#444"
    >
      FAIL
    </text>
  `;
}
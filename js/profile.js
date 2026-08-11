document.addEventListener("DOMContentLoaded", () => {
  const jwt = localStorage.getItem("jwt");

  if (!jwt) {
    window.location.replace("index.html");
    return;
  }

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("jwt");
      window.location.replace("index.html");
    });
  }

  loadProfile();
});


async function loadProfile() {
  try {
    const data = await fetchAllData();

    const user = data.user?.[0];

    if (!user) {
      throw new Error("No user data returned.");
    }


    // ==========================================
    // USER INFORMATION
    // ==========================================

    setText("user-login", user.login);
    setText("user-login-card", user.login);
    setText("user-id", user.id);


    // ==========================================
    // LEVEL
    //
    // Prefer Bahrain bh-module level entries.
    // If none exist, use the highest level found.
    // ==========================================

    const allLevels = user.level || [];

    const moduleLevels = allLevels.filter((tx) => {
      if (!tx.path) return false;

      return tx.path
        .toLowerCase()
        .startsWith("/bahrain/bh-module");
    });

    const levelsToUse =
      moduleLevels.length > 0
        ? moduleLevels
        : allLevels;

    const level = levelsToUse.reduce(
      (highest, tx) =>
        Math.max(
          highest,
          Number(tx.amount) || 0
        ),
      0
    );

    setText("user-level", level);


    // ==========================================
    // XP TRANSACTIONS
    // ==========================================

    const transactions =
      user.transactions || [];


    // ==========================================
    // TOTAL XP
    //
    // Same approach as the working version:
    // only Bahrain bh-module XP,
    // excluding individual piscine-js exercises.
    // ==========================================

    const totalXP = transactions
      .filter((tx) => {
        if (!tx.path) return false;

        const path =
          tx.path.toLowerCase();

        if (
          !path.startsWith(
            "/bahrain/bh-module"
          )
        ) {
          return false;
        }

        if (
          path.startsWith(
            "/bahrain/bh-module/piscine-js/"
          )
        ) {
          return false;
        }

        return true;
      })
      .reduce(
        (sum, tx) =>
          sum +
          (Number(tx.amount) || 0),
        0
      );

    setText(
      "total-xp",
      fmtXP(totalXP)
    );


    // ==========================================
    // AUDIT RATIO
    // ==========================================

    const auditUp =
      Number(user.totalUp) || 0;

    const auditDown =
      Number(user.totalDown) || 0;

    const ratio =
      auditDown > 0
        ? (auditUp / auditDown).toFixed(1)
        : "N/A";

    setText(
      "audit-ratio",
      ratio
    );

    setText(
      "audit-up",
      fmtXP(auditUp)
    );

    setText(
      "audit-down",
      fmtXP(auditDown)
    );


    // ==========================================
    // PASS / FAIL
    // ==========================================

    const gradedProjects =
      (data.projects || []).filter(
        (project) => {
          if (!project.path) {
            return false;
          }

          const path =
            project.path.toLowerCase();

          return (
            path.startsWith(
              "/bahrain/bh-module"
            ) &&
            !path.includes("piscine") &&
            !path.includes("onboarding") &&
            !path.includes("exam")
          );
        }
      );

    const passedPaths = {};
    const failedPaths = {};

    gradedProjects.forEach(
      (project) => {
        if (!project.path) return;

        if (project.grade > 0) {
          passedPaths[project.path] =
            true;
        } else if (
          project.grade === 0
        ) {
          failedPaths[project.path] =
            true;
        }
      }
    );

    const passCount =
      Object.keys(
        passedPaths
      ).length;

    const failCount =
      Object.keys(
        failedPaths
      ).length;

    setText(
      "projects-passed",
      passCount
    );

    setText(
      "projects-failed",
      failCount
    );


    // ==========================================
    // XP PER PROJECT GRAPH
    // ==========================================

    const projectTransactions =
      transactions.filter((tx) => {
        if (!tx.path) {
          return false;
        }

        const path =
          tx.path.toLowerCase();

        return (
          path.startsWith(
            "/bahrain/bh-module"
          ) &&
          !path.includes("piscine") &&
          !path.includes("onboarding") &&
          !path.includes("exam")
        );
      });


    const projects =
      buildProjectXP(
        projectTransactions
      );

    drawProjectXPGraph(
      projects
    );

    drawAuditGraph(
      auditUp,
      auditDown
    );


  } catch (error) {
    console.error(
      "Profile loading error:",
      error
    );

    setText(
      "global-error",
      error.message ||
        "Failed to load profile."
    );
  }
}


// ==========================================
// TEXT HELPER
// ==========================================

function setText(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      value ?? "-";
  }
}


// ==========================================
// XP FORMATTER
// ==========================================

function fmtXP(value) {
  const xp =
    Number(value) || 0;

  if (xp >= 1000000) {
    return (
      (xp / 1000000).toFixed(2) +
      " MB"
    );
  }

  if (xp >= 1000) {
    return (
      Math.round(xp / 1000) +
      " kB"
    );
  }

  return xp + " B";
}


// ==========================================
// BUILD XP PER PROJECT
// ==========================================

function buildProjectXP(
  transactions
) {
  const map = {};

  transactions.forEach(
    (tx) => {
      if (!tx.path) return;

      const amount =
        Number(tx.amount) || 0;

      if (
        !map[tx.path] ||
        amount > map[tx.path]
      ) {
        map[tx.path] =
          amount;
      }
    }
  );

  return Object.entries(map)
    .map(
      ([path, xp]) => ({
        path,

        name:
          path
            .split("/")
            .filter(Boolean)
            .pop(),

        xp,
      })
    )
    .filter(
      (project) =>
        project.xp > 0
    )
    .sort(
      (a, b) =>
        b.xp - a.xp
    )
    .slice(0, 10);
}


// ==========================================
// XP PER PROJECT GRAPH
// ==========================================

function drawProjectXPGraph(
  projects
) {
  const svg =
    document.getElementById(
      "xp-project-graph"
    );

  if (!svg) return;

  svg.innerHTML = "";


  if (!projects.length) {
    svg.innerHTML = `
      <text
        x="450"
        y="210"
        text-anchor="middle"
        class="chart-empty"
      >
        No project XP data available
      </text>
    `;

    return;
  }


  const width = 900;

  const left = 170;
  const right = 90;
  const top = 30;

  const rowHeight = 36;

  const graphWidth =
    width -
    left -
    right;


  const maxXP =
    Math.max(
      ...projects.map(
        (project) =>
          project.xp
      )
    );


  projects.forEach(
    (project, index) => {

      const y =
        top +
        index *
          rowHeight;


      const barWidth =
        (
          project.xp /
          maxXP
        ) *
        graphWidth;


      const track =
        createSVG(
          "rect",
          {
            x: left,
            y,
            width:
              graphWidth,
            height: 20,
            rx: 7,
            class:
              "chart-track",
          }
        );


      const bar =
        createSVG(
          "rect",
          {
            x: left,
            y,
            width:
              barWidth,
            height: 20,
            rx: 7,
            class:
              "chart-bar",
          }
        );


      const label =
        createSVG(
          "text",
          {
            x:
              left - 12,

            y:
              y + 15,

            "text-anchor":
              "end",

            class:
              "chart-label",
          }
        );


      label.textContent =
        project.name;


      const value =
        createSVG(
          "text",
          {
            x:
              left +
              barWidth +
              10,

            y:
              y + 15,

            class:
              "chart-value",
          }
        );


      value.textContent =
        fmtXP(
          project.xp
        );


      const title =
        createSVG(
          "title"
        );


      title.textContent =
        `${project.name}: ${fmtXP(
          project.xp
        )}`;


      bar.appendChild(
        title
      );

      svg.appendChild(
        track
      );

      svg.appendChild(
        bar
      );

      svg.appendChild(
        label
      );

      svg.appendChild(
        value
      );
    }
  );
}


// ==========================================
// AUDIT GRAPH
// ==========================================

function drawAuditGraph(
  auditUp,
  auditDown
) {
  const svg =
    document.getElementById(
      "audit-ratio-graph"
    );

  if (!svg) return;

  svg.innerHTML = "";


  const width = 520;

  const centerX =
    width / 2;

  const centerY = 180;

  const radius = 95;

  const circumference =
    2 *
    Math.PI *
    radius;


  const ratio =
    auditDown > 0
      ? auditUp /
        auditDown
      : 0;


  const progress =
    Math.min(
      ratio,
      1
    );


  const track =
    createSVG(
      "circle",
      {
        cx: centerX,
        cy: centerY,
        r: radius,

        class:
          "donut-track",
      }
    );


  const ring =
    createSVG(
      "circle",
      {
        cx: centerX,
        cy: centerY,
        r: radius,

        class:
          "donut-progress",

        "stroke-dasharray":
          circumference,

        "stroke-dashoffset":
          circumference *
          (1 - progress),

        transform:
          `rotate(-90 ${centerX} ${centerY})`,
      }
    );


  const number =
    createSVG(
      "text",
      {
        x: centerX,

        y:
          centerY + 12,

        "text-anchor":
          "middle",

        class:
          "donut-number",
      }
    );


  number.textContent =
    auditDown > 0
      ? ratio.toFixed(1)
      : "N/A";


  const label =
    createSVG(
      "text",
      {
        x: centerX,

        y:
          centerY + 45,

        "text-anchor":
          "middle",

        class:
          "donut-label",
      }
    );


  label.textContent =
    "AUDIT RATIO";


  const details =
    createSVG(
      "text",
      {
        x: centerX,
        y: 345,

        "text-anchor":
          "middle",

        class:
          "chart-label",
      }
    );


  details.textContent =
    `${fmtXP(
      auditUp
    )} given · ${fmtXP(
      auditDown
    )} received`;


  svg.appendChild(
    track
  );

  svg.appendChild(
    ring
  );

  svg.appendChild(
    number
  );

  svg.appendChild(
    label
  );

  svg.appendChild(
    details
  );
}


// ==========================================
// SVG HELPER
// ==========================================

function createSVG(
  tag,
  attributes = {}
) {
  const element =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      tag
    );


  Object.entries(
    attributes
  ).forEach(
    ([key, value]) => {
      element.setAttribute(
        key,
        value
      );
    }
  );


  return element;
}
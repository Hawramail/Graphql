document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwt');

  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const logoutBtn = document.getElementById('logout-btn');
  const globalError = document.getElementById('global-error');

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    window.location.href = 'index.html';
  });

  loadProfile(globalError);
});

async function loadProfile(globalError) {
  try {
    const user = await getCurrentUser();
    renderUserInfo(user);

    const [xpRows, progressRows, recentResults] = await Promise.all([
      getUserXp(user.id),
      getUserProgress(user.id),
      getRecentResults(user.id),
    ]);

    renderXpSummary(xpRows);
    renderProgressSummary(progressRows);
    renderRecentResults(recentResults);

    const xpPoints = buildXpOverTime(xpRows);
    renderXpGraph(xpPoints);

    const passFailData = computePassFail(progressRows);
    renderPassFailGraph(passFailData);
  } catch (error) {
    console.error('Profile loading error:', error);
    globalError.textContent = error.message || 'Failed to load profile data.';
  }
}

function renderUserInfo(user) {
  const userLoginTop = document.getElementById('user-login');
  const userId = document.getElementById('user-id');
  const userLoginCard = document.getElementById('user-login-card');

  if (userLoginTop) userLoginTop.textContent = user.login || '-';
  if (userId) userId.textContent = user.id ?? '-';
  if (userLoginCard) userLoginCard.textContent = user.login || '-';
}

function renderXpSummary(xpRows) {
  const totalXpEl = document.getElementById('total-xp');
  const xpProjectsEl = document.getElementById('xp-projects');

  const totalXp = xpRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  if (totalXpEl) {
    totalXpEl.textContent = totalXp.toLocaleString();
  }

  if (xpProjectsEl) {
    xpProjectsEl.textContent = xpRows.length.toLocaleString();
  }
}

function renderProgressSummary(progressRows) {
  const passCountEl = document.getElementById('pass-count');
  const failCountEl = document.getElementById('fail-count');
  const totalAttemptsEl = document.getElementById('total-attempts');

  const stats = computePassFail(progressRows);

  if (passCountEl) {
    passCountEl.textContent = stats.pass.toLocaleString();
  }

  if (failCountEl) {
    failCountEl.textContent = stats.fail.toLocaleString();
  }

  if (totalAttemptsEl) {
    totalAttemptsEl.textContent = progressRows.length.toLocaleString();
  }
}

function renderRecentResults(results) {
  const resultsList = document.getElementById('recent-results-list');
  if (!resultsList) return;

  resultsList.innerHTML = '';

  if (!results.length) {
    const li = document.createElement('li');
    li.textContent = 'No recent results found.';
    resultsList.appendChild(li);
    return;
  }

  results.forEach((result) => {
    const li = document.createElement('li');

    const grade = Number(result.grade);
    const status = grade === 1 ? 'PASS' : grade === 0 ? 'FAIL' : 'N/A';
    const date = result.createdAt
      ? new Date(result.createdAt).toLocaleDateString()
      : 'Unknown date';

    li.textContent = `${status} - ${result.path || 'No path'} - ${date}`;
    resultsList.appendChild(li);
  });
}
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

    const [xpRows, auditRows] = await Promise.all([
      getUserXp(user.id),
      getUserAuditTransactions(user.id),
    ]);

    renderXpSummary(xpRows);

    const projectXp = buildXpByProject(xpRows);
    renderXpByProjectGraph(projectXp);

    const auditStats = computeAuditRatio(auditRows);
    renderAuditSummary(auditStats);
    renderAuditRatioGraph(auditStats);
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
  const totalXp = xpRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  if (totalXpEl) {
    totalXpEl.textContent = totalXp.toLocaleString();
  }
}

function renderAuditSummary(stats) {
  const auditRatioEl = document.getElementById('audit-ratio');
  const auditUpEl = document.getElementById('audit-up');
  const auditDownEl = document.getElementById('audit-down');

  if (auditRatioEl) auditRatioEl.textContent = stats.ratio.toFixed(2);
  if (auditUpEl) auditUpEl.textContent = stats.up.toLocaleString();
  if (auditDownEl) auditDownEl.textContent = stats.down.toLocaleString();
}

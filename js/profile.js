document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwt');

  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const logoutBtn = document.getElementById('logout-btn');
  const globalError = document.getElementById('global-error');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('jwt');
      window.location.href = 'index.html';
    });
  }

  loadProfile(globalError);
});

async function loadProfile(globalError) {
  try {
    setLoadingState(true);

    const user = await getCurrentUser();
    renderUserInfo(user);

    const [xpRows, auditStats] = await Promise.all([
      getUserXp(user.id),
      getUserAuditStats(user.id),
    ]);

    renderXpSummary(xpRows);
    renderAuditSummary(auditStats);
    renderXpByProjectGraph(buildXpByProject(xpRows));
    renderAuditRatioGraph(auditStats);

    if (globalError) globalError.textContent = '';
  } catch (error) {
    console.error('Profile loading error:', error);
    if (globalError) globalError.textContent = error.message || 'Failed to load profile data.';
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  document.body.classList.toggle('is-loading', isLoading);
}

function renderUserInfo(user) {
  setText('user-login', user.login || '-');
  setText('user-id', user.id ?? '-');
  setText('user-login-card', user.login || '-');
}

function renderXpSummary(xpRows) {
  const totalXp = Array.isArray(xpRows)
    ? xpRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    : 0;

  setText('total-xp', formatXp(totalXp, { compact: true }));
}

function renderAuditSummary(stats) {
  setText('audit-ratio', Number(stats.ratio || 0).toFixed(2));
  setText('audit-up', formatXp(stats.up || 0, { compact: true }));
  setText('audit-down', formatXp(stats.down || 0, { compact: true }));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

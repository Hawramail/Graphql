document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('jwt')) {
    window.location.replace('profile.html');
    return;
  }

  const form = document.getElementById('login-form');
  const identifierInput = document.getElementById('identifier');
  const passwordInput = document.getElementById('password');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    errorEl.textContent = '';

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) {
      errorEl.textContent = 'Please enter username/email and password.';
      return;
    }

    try {
      const credentials = btoa(`${identifier}:${password}`);

      const response = await fetch(SIGNIN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Invalid credentials.');
      }

      const jwt =
        typeof data === 'string'
          ? data
          : data.token || data.jwt || data.access_token;

      if (!jwt) {
        throw new Error('No token received.');
      }

      localStorage.setItem('jwt', jwt);

      window.location.replace('profile.html');

    } catch (error) {
      console.error('Login error:', error);

      errorEl.textContent =
        error.message || 'Login failed.';
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const existingToken = localStorage.getItem('jwt');

  if (existingToken) {
    window.location.href = 'profile.html';
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
      errorEl.textContent = 'Please enter both username/email and password.';
      return;
    }

    try {
      const basicToken = btoa(`${identifier}:${password}`);

      const response = await fetch(SIGNIN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicToken}`,
        },
      });

      const rawText = (await response.text()).trim();
      console.log('signin raw response:', rawText);

      if (!response.ok) {
        errorEl.textContent = 'Invalid credentials. Please try again.';
        return;
      }

      let jwt = rawText;

      // If server returned JSON, try to extract token
      if (rawText.startsWith('{') || rawText.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawText);
          jwt = parsed.token || parsed.jwt || parsed.access_token || '';
        } catch (e) {
          // keep rawText as fallback
        }
      }

      // remove accidental surrounding quotes
      jwt = jwt.replace(/^"+|"+$/g, '').trim();

      // basic JWT sanity check
      if (!jwt || jwt.split('.').length !== 3) {
        console.error('Stored token is not a valid JWT format:', jwt);
        errorEl.textContent = 'Login failed: server did not return a valid JWT.';
        return;
      }

      localStorage.setItem('jwt', jwt);
      window.location.href = 'profile.html';
    } catch (error) {
      console.error('Login error:', error);
      errorEl.textContent = 'Could not reach the login server.';
    }
  });
});
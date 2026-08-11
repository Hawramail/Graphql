if (localStorage.getItem("jwt")) {
  window.location.replace("profile.html");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const identifierInput = document.getElementById("identifier");
  const passwordInput = document.getElementById("password");
  const errorEl = document.getElementById("login-error");
  const submitBtn = form.querySelector('button[type="submit"]');

  const defaultButtonText = submitBtn.textContent;

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading
      ? "Signing in..."
      : defaultButtonText;
  }

  function showError(message) {
    errorEl.textContent = message;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    showError("");

    const identifier =
      identifierInput.value.trim();

    const password =
      passwordInput.value;

    if (!identifier || !password) {
      showError(
        "Please enter your username/email and password."
      );
      return;
    }

    setLoading(true);

    try {
      const credentials =
        btoa(`${identifier}:${password}`);

      const response =
        await fetch(SIGNIN_URL, {
          method: "POST",

          headers: {
            Authorization:
              `Basic ${credentials}`,
          },
        });

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          throw new Error(
            "Invalid credentials. Check your username/email and password."
          );
        }

        throw new Error(
          data.error ||
          `Server error (${response.status})`
        );
      }

      let jwt;

      if (typeof data === "string") {
        jwt = data;
      } else if (data.token) {
        jwt = data.token;
      } else if (data.access_token) {
        jwt = data.access_token;
      } else {
        jwt = String(data);
      }

      if (
        !jwt ||
        jwt === "null" ||
        jwt === "undefined"
      ) {
        throw new Error(
          "No token received. Please try again."
        );
      }

      localStorage.setItem(
        "jwt",
        jwt
      );

      window.location.replace(
        "profile.html"
      );

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      showError(
        error.message ||
        "Login failed."
      );

    } finally {
      setLoading(false);
    }
  });
});
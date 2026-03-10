const loginForm = document.getElementById("logInForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.status === "success") {
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("display_name", data.display_name);

      window.location.href = "Main-page.html";
    } else {
      alert(data.message);
    }

  } catch (err) {
    console.error(err);
    alert("Something went wrong. Try again.");
  }
});
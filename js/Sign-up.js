
// Fade in animation
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("show");
});

document.getElementById("SignUpForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.disabled = true;

  const display_name = document.getElementById("display_name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const current_balance = document.getElementById("current_balance").value;

  try {
    const response = await fetch("http://localhost:3000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name, email, password, current_balance })
    });

    const data = await response.json();

    if (data.status === "success") {
      alert("Signup successful!");
      window.location.href = "Mainpage.html";
    } else {
      alert("Error: " + data.message);
    }

  } catch (error) {
    alert("Something went wrong.");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
});
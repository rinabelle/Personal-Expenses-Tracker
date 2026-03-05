const forgotForm = document.getElementById("Form");

forgotForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;

  try {
    const response = await fetch("http://localhost:3000/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    const oldBox = document.querySelector(".reset-link");
    if (oldBox) oldBox.remove();

    const form = document.getElementById("Form");
    const message = data.status === "success" ? `Reset link generated! Token: ${data.token}` : data.message;

    form.insertAdjacentHTML(
      "afterend",
      `<div class="reset-link">${message}</div>`
    );
  } catch (err) {
    console.error(err);
    alert("Something went wrong. Try again.");
  }
});
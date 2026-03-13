const signUpForm = document.getElementById("SignUpForm");

signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const display_name = document.getElementById("display_name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const starting_balance = document.getElementById("starting_balance").value;

  try {
    const response = await fetch("http://localhost:3000/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        display_name,
        email,
        password,
        starting_balance
      })
    });

    const data = await response.json();

    if (data.status === "success") {
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("display_name", data.display_name);
      localStorage.setItem("starting_money", data.starting_balance);

      window.location.href = "Main-page.html";
    } else {
      alert(data.message);
    }

  } catch (err) {
    console.error(err);
    alert("Something went wrong.");
  }
});
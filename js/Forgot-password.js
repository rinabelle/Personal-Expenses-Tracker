// Smooth transition (White Screen from the start)
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".container")) {
    const body = document.body;

    body.classList.add("show");

    // solid white overlay
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100vh";
    overlay.style.background =
      "linear-gradient(to bottom, white 0%, white 90%, transparent 100%)";
    overlay.style.zIndex = "1000";
    overlay.style.pointerEvents = "none";
    overlay.style.transition = "transform 1s ease";
    overlay.style.transform = "translateY(0)";
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.transform = "translateY(-100%)";

      setTimeout(() => {
        overlay.remove();
      }, 1000);
    }, 50);
  }
});

// Transition in back to login button
function toLogin() {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  overlay.classList.add("active");

  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  setTimeout(() => {
    window.location.href = "Log-in.html";
  }, 1200);
}

// Function to animate page transition and redirect
function animateRedirect(url) {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  overlay.classList.add("active");

  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  setTimeout(() => {
    window.location.href = url;
  }, 1200);
}

// Intercept all reset link clicks
document.addEventListener("click", function (e) {
  const target = e.target;
  if (target.matches(".reset-link a")) {
    e.preventDefault();
    const url = target.href;
    animateRedirect(url);
  }
});

// Forgot Password
document.getElementById("Form").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value;

  // Remove previous reset link box if it exists
  const oldBox = document.querySelector(".reset-link");
  if (oldBox) oldBox.remove();

  fetch("php/Forgot-password.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "email=" + encodeURIComponent(email),
  })
    .then((response) => response.text())
    .then((data) => {
      // Insert new box after the form
      const form = document.getElementById("Form");
      form.insertAdjacentHTML(
        "afterend",
        "<div class='reset-link'>" + data + "</div>",
      );
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

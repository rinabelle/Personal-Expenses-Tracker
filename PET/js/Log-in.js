// Smooth transition (White Screen from the start)
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".logIn-container")) {
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

// Transition in buttons and anchors
function toForgotPassword() {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  overlay.classList.add("active");

  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  setTimeout(() => {
    window.location.href = "Forgot-password.html";
  }, 1200);
}

function toSignup() {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  overlay.classList.add("active");

  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  setTimeout(() => {
    window.location.href = "Sign-up.html";
  }, 1200);
}

// Check login before transition to Main Page
document.getElementById("logInForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(this);

  fetch("php/Log-in.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        toMainpage();
      } else {
        alert(data.message);
      }
    })
    .catch((err) => console.error(err));
});

function toMainpage() {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  overlay.classList.add("active");

  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  setTimeout(() => {
    window.location.href = "Main-page.html";
  }, 1200);
}

// Smooth transition (White Screen from the start)
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".signUp-container")) {
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

// Check sign up before going to Main Page
document.getElementById("SignUpForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.disabled = true;

  const formData = new FormData(form);

  fetch("php/Sign-up.php", { method: "POST", body: formData })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        localStorage.setItem("justSignedUp", "true");
        toMainpage();
      } else {
        alert("Error: " + data.message);
      }
    })
    .catch((error) => {
      alert("Something went wrong.");
      console.error(error);
    })
    .finally(() => {
      submitBtn.disabled = false;
    });
});

function toMainpage() {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  overlay.classList.add("active");

  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  setTimeout(() => {
    localStorage.setItem("justSignedUp", "true");
    window.location.href = "Main-page.html";
  }, 1200);
}

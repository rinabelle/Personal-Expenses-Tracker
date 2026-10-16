window.addEventListener("load", () => {
  document.body.classList.add("show");
});

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
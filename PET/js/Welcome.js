window.addEventListener("load", () => {
  // Smooth intro: fade-in the body
  document.body.classList.add("show");
});
  // Optional: Add interactive hover effect with JS
  const features = document.querySelectorAll('.feature');
  features.forEach(f => {
    f.addEventListener('mouseenter', () => {
      f.style.transform = 'translateY(-8px)';
    });
    f.addEventListener('mouseleave', () => {
      f.style.transform = 'translateY(0)';
    });
  });
// Function for "Get Started" button page transition
function toSignup() {
  const overlay = document.querySelector(".page-transition");
  const solidOverlay = document.querySelector(".page-transition-solid");

  // Activate gradient overlay
  overlay.classList.add("active");

  // Activate solid overlay slightly later
  setTimeout(() => {
    solidOverlay.classList.add("active");
  }, 600);

  // Redirect after the transition
  setTimeout(() => {
    window.location.href = "Sign-up.html";
  }, 1200);

}
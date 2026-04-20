// Client-side enhancements for better UX
document.addEventListener('DOMContentLoaded', function() {
  // Form validation and loading states
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Loading...';
        
        // Re-enable after 10 seconds as fallback
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }, 10000);
      }
    });
  });

  // Input validation feedback
  const inputs = document.querySelectorAll('input[required], textarea[required]');
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.value.trim() === '') {
        this.classList.add('error');
      } else {
        this.classList.remove('error');
      }
    });

    input.addEventListener('input', function() {
      if (this.classList.contains('error') && this.value.trim() !== '') {
        this.classList.remove('error');
      }
    });
  });

  // Smooth scrolling for anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Job card hover effects
  const jobCards = document.querySelectorAll('.job');
  jobCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-4px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
});
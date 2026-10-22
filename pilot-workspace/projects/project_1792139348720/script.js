// Simple form submission handler (demo only)
document.getElementById('contact-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    this.reset();
});
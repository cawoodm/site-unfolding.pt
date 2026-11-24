// Mobile menu toggle and active-section highlight for the home pages.

const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');

if (toggle && menu) {
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('hidden', !open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  // Close the mobile menu after a link is chosen.
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a') && getComputedStyle(toggle).display !== 'none') setOpen(false);
  });
}

// Mark the menu link of the section in view with aria-current.
const links = [...document.querySelectorAll('[data-menu] a[href^="#"]')];
const sections = links.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);

if (sections.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links) {
        link.toggleAttribute('aria-current', link.getAttribute('href') === `#${entry.target.id}`);
      }
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((section) => observer.observe(section));
}

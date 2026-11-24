// Mobile menu toggle and active-section highlight for the page.

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

// Language menu (<details>): close it on a click outside or on Escape.
const langMenu = document.querySelector('[data-lang-menu]');

if (langMenu) {
  document.addEventListener('click', (event) => {
    if (langMenu.open && !langMenu.contains(event.target)) langMenu.open = false;
  });
  langMenu.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !langMenu.open) return;
    langMenu.open = false;
    langMenu.querySelector('summary').focus();
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

// Legal notice and privacy policy open as <dialog>s: footer links (#legal-notice,
// #privacy) and deep links like /en/#privacy.
const dialogFor = (hash) => {
  const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
  return target instanceof HTMLDialogElement ? target : null;
};

document.addEventListener('click', (event) => {
  const link = event.target.closest?.('a[href^="#"]');
  const dialog = link && dialogFor(link.getAttribute('href'));
  if (!dialog) return;
  event.preventDefault();
  dialog.showModal();
});

document.querySelectorAll('dialog').forEach((dialog) => {
  // A click on the backdrop reports the dialog itself as its target.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (location.hash === `#${dialog.id}`) history.replaceState(null, '', location.pathname + location.search);
  });
});

dialogFor(location.hash)?.showModal();

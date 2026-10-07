// Content, navigation and case studies also work without JavaScript.
document.getElementById('year').textContent = String(new Date().getFullYear());

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const projects = [...document.querySelectorAll('.project')];
const filters = document.querySelector('.project-filters');
const filterStatus = document.querySelector('.filter-status');
filters.hidden = false;
filters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  filters.querySelectorAll('button').forEach((item) => {
    item.setAttribute('aria-pressed', String(item === button));
  });
  const category = button.dataset.filter;
  let count = 0;
  projects.forEach((project) => {
    const visible = category === 'all' || project.dataset.categories.split(' ').includes(category);
    project.hidden = !visible;
    if (visible) {
      count += 1;
      project.classList.add('is-visible');
      if (!reducedMotion.matches) {
        project.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'ease-out' });
      }
    }
  });
  filterStatus.textContent = `${count} ${count === 1 ? 'project' : 'projects'} shown${category === 'all' ? '' : ` in ${button.textContent.trim()}`}.`;
});

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-ready');
  const reveal = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach((element) => reveal.observe(element));
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) document.documentElement.classList.remove('motion-ready');
  });
}

// Use the native dialog for keyboard focus management and Escape-to-close.
const dialog = document.getElementById('image-dialog');
const image = document.getElementById('lightbox-image');
const caption = document.getElementById('image-caption');
const position = document.getElementById('image-position');
const previous = document.getElementById('previous-image');
const next = document.getElementById('next-image');
let gallery = [];
let activeImage = 0;
let opener;

function showImage(index) {
  activeImage = (index + gallery.length) % gallery.length;
  const selected = gallery[activeImage];
  image.src = selected.dataset.image;
  image.alt = selected.dataset.caption;
  caption.textContent = selected.dataset.caption;
  position.textContent = `${activeImage + 1} / ${gallery.length}`;
  previous.hidden = next.hidden = gallery.length < 2;
}

document.querySelectorAll('[data-image]').forEach((button) => {
  button.addEventListener('click', () => {
    opener = button;
    gallery = [...button.closest('.project').querySelectorAll('[data-image]')];
    showImage(gallery.indexOf(button));
    dialog.showModal();
  });
});
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
previous.addEventListener('click', () => showImage(activeImage - 1));
next.addEventListener('click', () => showImage(activeImage + 1));
dialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showImage(activeImage + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});
dialog.addEventListener('close', () => opener?.focus());

// A small pointer response makes the system diagram feel tactile on desktop.
const panel = document.querySelector('.system-panel');
panel.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
  const box = panel.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - 0.5;
  const y = (event.clientY - box.top) / box.height - 0.5;
  panel.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
});
panel.addEventListener('pointerleave', () => { panel.style.transform = ''; });

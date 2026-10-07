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
    gallery = [...button.closest('.project, .gallery-group').querySelectorAll('[data-image]')];
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

// Scroll controls the showcase, typography and imagery without intercepting the wheel.
const hero = document.querySelector('.cinematic-hero');
const story = document.querySelector('.hardware-story');
const sticky = document.querySelector('.hardware-sticky');
const frames = [...document.querySelectorAll('.story-frame')];
const chapters = [...document.querySelectorAll('[data-story-jump]')];
const header = document.querySelector('.site-header');
const work = document.getElementById('work');
const contact = document.getElementById('contact');

const root = document.documentElement;
const clamp = (number, min = 0, max = 1) => Math.min(max, Math.max(min, number));
let scheduled = false;
let activeChapter = -1;
let sceneEnabled = false;

function setMotionMode() {
  sceneEnabled = !reducedMotion.matches && window.innerHeight >= 700;
  root.classList.toggle('scroll-enabled', sceneEnabled);
  activeChapter = -1;
  updateScroll();
}

function updateScroll() {
  scheduled = false;
  const heroBox = hero.getBoundingClientRect();
  const storyBox = story.getBoundingClientRect();
  const workBox = work.getBoundingClientRect();
  const contactBox = contact.getBoundingClientRect();
  const range = Math.max(1, root.scrollHeight - window.innerHeight);
  root.style.setProperty('--page-progress', String(clamp(window.scrollY / range)));
  const overDarkSurface = workBox.top > 75 || (contactBox.top <= 75 && contactBox.bottom > 75);
  header.classList.toggle('is-light', !overDarkSurface);

  if (!reducedMotion.matches) {
    const heroProgress = clamp(-heroBox.top / heroBox.height);
    hero.style.setProperty('--title-shift-1', `${heroProgress * -95}px`);
    hero.style.setProperty('--title-shift-2', `${heroProgress * 75}px`);
    hero.style.setProperty('--title-shift-3', `${heroProgress * -45}px`);
    hero.style.setProperty('--hero-image-shift', `${heroProgress * -130}px`);
    hero.style.setProperty('--hero-small-shift', `${heroProgress * -45}px`);
    const contactProgress = clamp((window.innerHeight - contactBox.top) / (window.innerHeight + contactBox.height));
    contact.style.setProperty('--contact-shift', `${(contactProgress - 0.5) * 120}px`);
  }

  const progress = clamp(-storyBox.top / Math.max(1, storyBox.height - sticky.offsetHeight));
  const chapter = Math.min(frames.length - 1, Math.floor(progress * frames.length));
  const localProgress = clamp(progress * frames.length - chapter);
  story.style.setProperty('--chapter-progress', String(localProgress));
  if (sceneEnabled) {
    story.style.setProperty('--story-image-scale', String(1.01 + localProgress * 0.055));
    story.style.setProperty('--story-image-y', `${(0.5 - localProgress) * 16}px`);
  }
  const prototypeProgress = sceneEnabled ? (chapter > 1 ? 1 : chapter < 1 ? 0 : clamp((localProgress - 0.12) / 0.76)) : 0.5;
  story.style.setProperty('--prototype-progress', `${prototypeProgress * 100}%`);
  story.style.setProperty('--prototype-seam-opacity', String(prototypeProgress > 0.02 && prototypeProgress < 0.98 ? 1 : 0));
  const cncImage = frames[1].querySelector('[data-image]');
  cncImage.dataset.image = prototypeProgress > 0.5 ? 'assets/final_product.webp' : 'assets/cnc_3d_final_design.webp';
  cncImage.dataset.caption = prototypeProgress > 0.5 ? 'Desktop CNC - built prototype' : 'Desktop CNC - final mechanical design';
  if (chapter !== activeChapter) {
    activeChapter = chapter;
    frames.forEach((frame, index) => {
      const active = !sceneEnabled || index === chapter;
      frame.classList.toggle('is-active', active);
      frame.inert = !active;
      frame.setAttribute('aria-hidden', String(!active));
    });
    chapters.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === chapter));
      button.classList.toggle('is-past', index < chapter);
    });
  }
}

function scheduleScroll() {
  if (!scheduled) {
    scheduled = true;
    window.requestAnimationFrame(updateScroll);
  }
}

chapters.forEach((button, index) => {
  button.addEventListener('click', () => {
    const start = window.scrollY + story.getBoundingClientRect().top;
    const scrollRange = Math.max(0, story.offsetHeight - sticky.offsetHeight);
    window.scrollTo({ top: start + scrollRange * ((index + 0.18) / frames.length), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
});

// Featured project links always reveal their destination, even after filtering.
document.querySelectorAll('.story-project-link').forEach((link) => {
  link.addEventListener('click', () => {
    filters.querySelector('[data-filter="all"]').click();
    const target = document.querySelector(link.getAttribute('href'));
    target.classList.add('is-visible');
  });
});

document.querySelectorAll('.project .cover-image').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--card-y', `${((event.clientX - box.left) / box.width - 0.5) * 7}deg`);
    card.style.setProperty('--card-x', `${-((event.clientY - box.top) / box.height - 0.5) * 7}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--card-x', '0deg');
    card.style.setProperty('--card-y', '0deg');
  });
});

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: scheduleScroll, onRefresh: scheduleScroll });
window.addEventListener('resize', setMotionMode, { passive: true });
reducedMotion.addEventListener('change', setMotionMode);
setMotionMode();

// One page-level theme, initially following the system preference.
const themePreference = window.matchMedia('(prefers-color-scheme: dark)');
const themeButton = document.querySelector('.theme-toggle');
let explicitTheme;
try { explicitTheme = localStorage.getItem('portfolio-theme'); } catch {}
function applyTheme() {
  const dark = explicitTheme ? explicitTheme === 'dark' : themePreference.matches;
  root.dataset.theme = dark ? 'dark' : 'light';
  themeButton.textContent = dark ? 'Light' : 'Dark';
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
}
themeButton.addEventListener('click', () => {
  explicitTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('portfolio-theme', explicitTheme); } catch {}
  applyTheme();
});
themePreference.addEventListener('change', applyTheme);
applyTheme();
window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

// Focus on visible mechanical details without pretending the render is a 3D model.
const robotProject = document.getElementById('robocup');
const robotDescriptions = {
  assembly: 'Explore the original CAD assembly, then open the image for a closer look.',
  drive: 'The side assembly shows toothed belts, pulleys and supported shafts within the metal frame.',
  front: 'The front assembly brings curved drum surfaces, circular end plates and brackets into a compact mechanism.'
};
robotProject.querySelectorAll('[data-robot-focus]').forEach(button => {
  button.addEventListener('click', () => {
    robotProject.querySelector('.robocup-explorer').dataset.focus = button.dataset.robotFocus;
    robotProject.querySelectorAll('[data-robot-focus]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    robotProject.querySelector('.robocup-focus-description').textContent = robotDescriptions[button.dataset.robotFocus];
  });
});
// Entry motion establishes the headline first, followed by the robot and electronics.
if (!reducedMotion.matches) {
  gsap.from('.hero-copy > *', { opacity: 0, y: 24, duration: .8, stagger: .1, ease: 'power3.out', clearProps: 'opacity,transform' });
  gsap.from('.hero-art', { opacity: 0, y: 35, duration: 1.1, delay: .25, ease: 'power3.out', clearProps: 'opacity,transform' });
}

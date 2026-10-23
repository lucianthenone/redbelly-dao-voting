// Theme toggle, back to top button and the guide pages list. No dependencies.
(function () {
  var root = document.documentElement;
  var KEY = 'dao-voting-theme';

  // Theme
  var toggle = document.querySelector('.theme-toggle');
  var themeColor = document.querySelector('meta[name="theme-color"]');
  function applyTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    if (themeColor) themeColor.setAttribute('content', theme === 'light' ? '#EDF1F4' : '#0c1317');
    if (toggle) toggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    if (save) {
      try { localStorage.setItem(KEY, theme); } catch (e) {}
    }
  }
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
  if (toggle) {
    toggle.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
    });
  }
  // Follow the system setting until the reader picks a theme here.
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem(KEY); } catch (err) {}
      if (!saved) applyTheme(e.matches ? 'light' : 'dark', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // Back to top
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    toTop.hidden = false;
    var ticking = false;
    var update = function () {
      toTop.classList.toggle('is-visible', window.scrollY > 480);
      toTop.tabIndex = window.scrollY > 480 ? 0 : -1;
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
    toTop.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var target = document.getElementById('top');
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  }

  // The guide pages list starts closed on small screens
  var tocBox = document.querySelector('.toc__box');
  if (tocBox && window.matchMedia && !window.matchMedia('(min-width: 1100px)').matches) {
    tocBox.open = false;
    tocBox.addEventListener('click', function (e) {
      if (e.target.closest('a')) tocBox.open = false;
    });
  }
})();

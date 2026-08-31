/* ============================================================
   EcoTech – Smart E-Waste Management System
   script.js  |  College Project – Phase 1
   ============================================================

   API_BASE points to the Express backend.
   When opening index.html via the Node server (http://localhost:3000)
   this resolves correctly. If you still open the file directly with
   Live Server on a different port, change API_BASE to the full URL:
     const API_BASE = 'http://localhost:3000/api';
   ============================================================ */

const API_BASE = window.location.port === '3000'
  ? '/api'                        // served by Express
  : 'http://localhost:3000/api';  // opened via Live Server / file://

/* -----------------------------------------------------------------------
   1. NAVBAR – active link highlighting on scroll
   ----------------------------------------------------------------------- */
(function () {
  'use strict';

  const navLinks = document.querySelectorAll('#mainNavbar .nav-link');

  function setActiveLink () {
    const scrollY = window.pageYOffset;
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      const top    = target.offsetTop - 100;
      const bottom = top + target.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', setActiveLink, { passive: true });
  setActiveLink();

  // Close mobile nav after clicking a link
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      const navCollapse = document.getElementById('navbarContent');
      if (navCollapse && navCollapse.classList.contains('show')) {
        const toggler = document.querySelector('.navbar-toggler');
        if (toggler) toggler.click();
      }
    });
  });
})();


/* -----------------------------------------------------------------------
   2. BACK-TO-TOP BUTTON
   ----------------------------------------------------------------------- */
(function () {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.pageYOffset > 400);
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();


/* -----------------------------------------------------------------------
   3. COLLECTION CENTER SEARCH & FILTER
      Fetches live data from GET /api/centers?search=&category=
      Falls back to DOM-only filtering if the API is unreachable.
   ----------------------------------------------------------------------- */
(function () {
  const searchInput    = document.getElementById('centerSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const resetBtn       = document.getElementById('resetFilter');
  const centersGrid    = document.getElementById('centersGrid');
  const noResults      = document.getElementById('noResults');

  if (!searchInput || !categoryFilter || !centersGrid) return;

  // ---- API-driven rendering ----

  /**
   * Build a single center card HTML string from an API response row.
   */
  function buildCenterCard (c) {
    const badgeClass = {
      all:       'badge-all',
      mobile:    'badge-mobile',
      battery:   'badge-battery',
      computer:  'badge-computer',
      appliance: 'badge-appliance',
    }[c.category] || 'badge-all';

    const badgeLabel = {
      all:       'All E-Waste',
      mobile:    'Mobile Phones',
      battery:   'Batteries',
      computer:  'Computers & Laptops',
      appliance: 'Appliances',
    }[c.category] || 'All E-Waste';

    return `
      <div class="col-md-6 col-lg-4 center-item">
        <div class="center-card h-100">
          <div class="center-badge ${badgeClass}">${badgeLabel}</div>
          <h5 class="center-name">${escHtml(c.name)}</h5>
          <p class="center-location">
            <i class="bi bi-geo-alt-fill me-1 text-danger"></i>${escHtml(c.location)}
          </p>
          <div class="center-detail">
            <i class="bi bi-recycle me-1"></i><strong>Accepts:</strong> ${escHtml(c.accepts)}
          </div>
          <div class="center-detail">
            <i class="bi bi-clock me-1"></i><strong>Hours:</strong> ${escHtml(c.hours)}
          </div>
          <button class="btn btn-eco-primary btn-sm mt-3 w-100"
            data-bs-toggle="modal" data-bs-target="#centerModal"
            data-name="${escAttr(c.name)}"
            data-location="${escAttr(c.location)}"
            data-accepts="${escAttr(c.accepts)}"
            data-hours="${escAttr(c.hours)}"
            data-contact="${escAttr(c.contact || 'Not available')}">
            <i class="bi bi-info-circle me-1"></i>View Details
          </button>
        </div>
      </div>`;
  }

  /** Fetch centers from API and re-render the grid */
  async function fetchAndRender () {
    const search   = searchInput.value.trim();
    const category = categoryFilter.value.trim();

    const params = new URLSearchParams();
    if (search)   params.set('search',   search);
    if (category) params.set('category', category);

    try {
      const res  = await fetch(`${API_BASE}/centers?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      centersGrid.innerHTML = json.data.map(buildCenterCard).join('');

      if (noResults) {
        noResults.classList.toggle('d-none', json.count > 0);
      }
    } catch (err) {
      // API unreachable – fall back to DOM-only filtering
      console.warn('[Centers] API unavailable, using DOM filter.', err.message);
      domFilter();
    }
  }

  /** DOM-only filter (offline / direct file:// fallback) */
  function domFilter () {
    const query    = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value.toLowerCase();
    let visible    = 0;

    document.querySelectorAll('.center-item').forEach(function (item) {
      const name    = (item.getAttribute('data-name')     || '').toLowerCase();
      const itemCat = (item.getAttribute('data-category') || '').toLowerCase();
      const show    = (query === '' || name.includes(query)) &&
                      (category === '' || itemCat === category || itemCat === 'all');
      item.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    if (noResults) noResults.classList.toggle('d-none', visible > 0);
  }

  searchInput.addEventListener('input',    fetchAndRender);
  categoryFilter.addEventListener('change', fetchAndRender);

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      searchInput.value    = '';
      categoryFilter.value = '';
      fetchAndRender();
    });
  }

  // Initial load from API
  fetchAndRender();
})();


/* -----------------------------------------------------------------------
   4. COLLECTION CENTER MODAL – populate details dynamically
   ----------------------------------------------------------------------- */
(function () {
  const centerModal = document.getElementById('centerModal');
  if (!centerModal) return;

  centerModal.addEventListener('show.bs.modal', function (event) {
    const btn = event.relatedTarget;
    if (!btn) return;

    document.getElementById('modalName').textContent     = btn.dataset.name     || '—';
    document.getElementById('modalLocation').textContent = btn.dataset.location || '—';
    document.getElementById('modalAccepts').textContent  = btn.dataset.accepts  || '—';
    document.getElementById('modalHours').textContent    = btn.dataset.hours    || '—';
    document.getElementById('modalContact').textContent  = btn.dataset.contact  || '—';
    document.getElementById('centerModalLabel').textContent = btn.dataset.name  || 'Center Details';
  });
})();


/* -----------------------------------------------------------------------
   5. REPORT FORM – POST to /api/reports  (multipart/form-data)
      Falls back to demo-only success message if API is unreachable.
   ----------------------------------------------------------------------- */
(function () {
  const form         = document.getElementById('reportForm');
  const successAlert = document.getElementById('reportSuccess');

  if (!form) return;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const submitBtn  = form.querySelector('[type="submit"]');
    const origLabel  = submitBtn.innerHTML;
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting…';

    // Build FormData to support optional file upload
    const fd = new FormData();
    fd.append('full_name',   document.getElementById('fullName').value.trim());
    fd.append('email',       document.getElementById('emailAddr').value.trim());
    fd.append('phone',       document.getElementById('phoneNum').value.trim());
    fd.append('location',    document.getElementById('locationField').value.trim());
    fd.append('ewaste_type', document.getElementById('ewasteType').value);
    fd.append('quantity',    document.getElementById('quantity').value);
    fd.append('description', document.getElementById('description').value.trim());

    const imageFile = document.getElementById('imageUpload').files[0];
    if (imageFile) fd.append('image', imageFile);

    try {
      const res  = await fetch(`${API_BASE}/reports`, { method: 'POST', body: fd });
      const json = await res.json();

      if (res.ok && json.success) {
        showSuccess(json.message || 'Thank you! Your e-waste report has been submitted successfully.');
        form.classList.remove('was-validated');
        form.reset();
      } else {
        const msgs = json.errors ? json.errors.join(' ') : (json.message || 'Submission failed.');
        showError(msgs);
      }
    } catch (err) {
      // API unreachable – show offline demo message
      console.warn('[Report] API unavailable, showing demo message.', err.message);
      showSuccess('Thank you! Your e-waste report has been recorded for demonstration purposes. (Offline mode – data was not stored.)');
      form.classList.remove('was-validated');
      form.reset();
    } finally {
      submitBtn.disabled  = false;
      submitBtn.innerHTML = origLabel;
    }
  });

  function showSuccess (msg) {
    if (!successAlert) return;
    successAlert.className = 'alert alert-success alert-dismissible';
    successAlert.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i><strong>Success!</strong> ${escHtml(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => successAlert.classList.add('d-none'), 10000);
  }

  function showError (msg) {
    if (!successAlert) return;
    successAlert.className = 'alert alert-danger alert-dismissible';
    successAlert.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i><strong>Error:</strong> ${escHtml(msg)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();


/* -----------------------------------------------------------------------
   6. ANIMATED COUNTER – Impact section stat numbers
   ----------------------------------------------------------------------- */
(function () {
  const statCards = document.querySelectorAll('.impact-stat-card .stat-number');
  if (!statCards.length) return;

  let animated = false;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.4 });

  const impactSection = document.getElementById('impact');
  if (impactSection) observer.observe(impactSection);

  function animateCounters () {
    statCards.forEach(function (el) {
      const originalText = el.textContent;
      const match = originalText.match(/[\d.]+/);
      if (!match) return;

      const target   = parseFloat(match[0]);
      const prefix   = originalText.split(match[0])[0];
      const suffix   = originalText.split(match[0])[1];
      const duration = 1500;
      const steps    = 60;
      const step     = target / steps;
      let current    = 0;
      let count      = 0;

      const interval = setInterval(function () {
        count++;
        current = Math.min(current + step, target);
        el.textContent = prefix + (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
        if (count >= steps) {
          el.textContent = originalText;
          clearInterval(interval);
        }
      }, duration / steps);
    });
  }
})();


/* -----------------------------------------------------------------------
   7. SMOOTH SCROLL FALLBACK
   ----------------------------------------------------------------------- */
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const navHeight = document.getElementById('mainNavbar')
          ? document.getElementById('mainNavbar').offsetHeight
          : 74;
        const top = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
})();


/* -----------------------------------------------------------------------
   8. UTILITY HELPERS
   ----------------------------------------------------------------------- */

/** Escape a string for safe insertion as HTML text content */
function escHtml (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Escape a string for safe use in an HTML attribute value */
function escAttr (str) {
  return String(str)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

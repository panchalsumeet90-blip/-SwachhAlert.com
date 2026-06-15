/* ═══════════════════════════════════════════════
   SwachhAlert — app.js
   Handles: image upload, geolocation, form submit,
   localStorage persistence, stat counter animation.
═══════════════════════════════════════════════ */

// ── Storage helpers ────────────────────────────

const STORAGE_KEY = 'swachhalert_complaints';

function loadComplaints() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveComplaints(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateID() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SWA-${ts}-${rand}`;
}

// ── Animate counter ────────────────────────────

function animateCount(el, target, duration = 900) {
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Page: Report Form (index.html) ─────────────

(function initReportPage() {
  const statEl = document.getElementById('stat-count');
  if (!statEl) return; // not on this page

  // Animate stat counter
  const complaints = loadComplaints();
  animateCount(statEl, complaints.length);

  // Elements
  const uploadZone    = document.getElementById('uploadZone');
  const imageInput    = document.getElementById('imageInput');
  const uploadPH      = document.getElementById('uploadPlaceholder');
  const imagePreview  = document.getElementById('imagePreview');
  const removeImgBtn  = document.getElementById('removeImg');
  const geoBtn        = document.getElementById('geoBtn');
  const geoBtnIcon    = document.getElementById('geoBtnIcon');
  const locationInput = document.getElementById('location');
  const submitBtn     = document.getElementById('submitBtn');
  const submitLabel   = document.getElementById('submitLabel');
  const submitSpinner = document.getElementById('submitSpinner');
  const toast         = document.getElementById('toast');
  const toastId       = document.getElementById('toastId');

  let imageDataURL = null;

  // ── Upload zone click ──
  uploadZone.addEventListener('click', (e) => {
    if (e.target === removeImgBtn) return;
    imageInput.click();
  });

  // ── File chosen via input ──
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) loadImageFile(file);
  });

  // ── Drag & drop ──
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
  });

  function loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      imageDataURL = ev.target.result;
      imagePreview.src = imageDataURL;
      uploadPH.classList.add('hidden');
      imagePreview.classList.remove('hidden');
      removeImgBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  // ── Remove image ──
  removeImgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    imageDataURL = null;
    imagePreview.src = '';
    imageInput.value = '';
    imagePreview.classList.add('hidden');
    removeImgBtn.classList.add('hidden');
    uploadPH.classList.remove('hidden');
  });

  // ── Geolocation ──
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    geoBtnIcon.textContent = '⏳';
    geoBtn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse-geocode using nominatim (free, no API key)
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await resp.json();
          locationInput.value = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        } catch {
          locationInput.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        }
        geoBtnIcon.textContent = '✅';
        geoBtn.disabled = false;
      },
      (err) => {
        geoBtnIcon.textContent = '📍';
        geoBtn.disabled = false;
        alert('Could not detect location. Please allow location access or type it manually.');
      }
    );
  });

  // ── Submit ──
  submitBtn.addEventListener('click', () => {
    const name     = document.getElementById('fullName').value.trim();
    const phone    = document.getElementById('phone').value.trim();
    const location = locationInput.value.trim();
    const ward     = document.getElementById('ward').value.trim();
    const category = document.getElementById('category').value;
    const desc     = document.getElementById('description').value.trim();

    // Validation
    if (!imageDataURL)   { shake(uploadZone);  showError('Please upload an image of the garbage.'); return; }
    if (!name)           { shake(document.getElementById('fullName'));  showError('Please enter your name.'); return; }
    if (!phone || !/^\d{10}$/.test(phone)) { shake(document.getElementById('phone')); showError('Please enter a valid 10-digit mobile number.'); return; }
    if (!location)       { shake(locationInput); showError('Please enter or detect your location.'); return; }
    if (!category)       { shake(document.getElementById('category')); showError('Please select an issue category.'); return; }
    if (!desc)           { shake(document.getElementById('description')); showError('Please add a description.'); return; }

    // Show spinner
    submitLabel.textContent = 'Submitting…';
    submitSpinner.classList.remove('hidden');
    submitBtn.disabled = true;

    // Simulate async (e.g. API call) — replace with real fetch() if needed
    setTimeout(() => {
      const complaint = {
        id: generateID(),
        name,
        phone,
        location,
        ward,
        category,
        description: desc,
        image: imageDataURL,
        status: 'Pending',
        timestamp: new Date().toISOString(),
      };

      const all = loadComplaints();
      all.unshift(complaint);
      saveComplaints(all);

      // Reset UI
      submitLabel.textContent = 'Submit Complaint';
      submitSpinner.classList.add('hidden');
      submitBtn.disabled = false;

      // Show toast
      toastId.textContent = `Complaint ID: ${complaint.id}`;
      toast.classList.remove('hidden');
      toast.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Update stat counter
      animateCount(statEl, all.length);

      // Reset form
      resetForm();
    }, 1200);
  });

  function resetForm() {
    ['fullName','phone','location','ward','description'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('category').value = '';
    imageDataURL = null;
    imageInput.value = '';
    imagePreview.src = '';
    imagePreview.classList.add('hidden');
    removeImgBtn.classList.add('hidden');
    uploadPH.classList.remove('hidden');
    geoBtnIcon.textContent = '📍';
  }

  function showError(msg) {
    alert(`⚠️ ${msg}`);
  }

  function shake(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake .4s ease';
    setTimeout(() => el.style.animation = '', 500);
  }

  // Add shake keyframe dynamically
  if (!document.getElementById('shake-style')) {
    const style = document.createElement('style');
    style.id = 'shake-style';
    style.textContent = `
      @keyframes shake {
        0%,100%{transform:translateX(0)}
        20%{transform:translateX(-6px)}
        40%{transform:translateX(6px)}
        60%{transform:translateX(-4px)}
        80%{transform:translateX(4px)}
      }
    `;
    document.head.appendChild(style);
  }

})();


// ── Page: Admin Panel (admin.html) ─────────────

(function initAdminPage() {
  const grid = document.getElementById('complaintsGrid');
  if (!grid) return; // not on this page

  let allComplaints = loadComplaints();
  let currentFilter = 'All';
  let searchQuery   = '';
  let activeModal   = null;

  // Stat elements
  const statTotal    = document.getElementById('adminTotal');
  const statPending  = document.getElementById('adminPending');
  const statReview   = document.getElementById('adminReview');
  const statResolved = document.getElementById('adminResolved');

  function updateStats(list) {
    const total    = list.length;
    const pending  = list.filter(c => c.status === 'Pending').length;
    const review   = list.filter(c => c.status === 'Reviewing').length;
    const resolved = list.filter(c => c.status === 'Resolved').length;
    if (statTotal)    animateCount(statTotal,    total);
    if (statPending)  animateCount(statPending,  pending);
    if (statReview)   animateCount(statReview,   review);
    if (statResolved) animateCount(statResolved, resolved);
  }

  function getFiltered() {
    return allComplaints.filter(c => {
      const matchFilter = currentFilter === 'All' || c.status === currentFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
  }

  function statusClass(s) {
    return { 'Pending':'status-pending', 'Reviewing':'status-reviewing', 'Resolved':'status-resolved' }[s] || 'status-pending';
  }

  function renderGrid() {
    const filtered = getFiltered();
    updateStats(allComplaints);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <span class="empty-icon">🗑️</span>
          <p>No complaints found.</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(c => `
      <div class="complaint-card" data-id="${c.id}">
        ${c.image
          ? `<img class="complaint-img" src="${c.image}" alt="Garbage photo" loading="lazy"/>`
          : `<div class="complaint-img-placeholder">📷</div>`
        }
        <div class="complaint-body">
          <div class="complaint-id">${c.id}</div>
          <span class="complaint-category">${c.category}</span>
          <div class="complaint-name">${escapeHTML(c.name)}</div>
          <div class="complaint-location">${escapeHTML(c.location)}</div>
          <div class="complaint-desc">${escapeHTML(c.description)}</div>
          <div class="complaint-meta">
            <span class="complaint-date">${formatDate(c.timestamp)}</span>
            <button class="status-badge ${statusClass(c.status)}" data-id="${c.id}" title="Click to change status">
              ${c.status}
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Card click → open modal
    grid.querySelectorAll('.complaint-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('status-badge')) return;
        openModal(card.dataset.id);
      });
    });

    // Status badge click → cycle status
    grid.querySelectorAll('.status-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleStatus(btn.dataset.id);
      });
    });
  }

  function cycleStatus(id) {
    const cycle = ['Pending', 'Reviewing', 'Resolved'];
    const complaint = allComplaints.find(c => c.id === id);
    if (!complaint) return;
    const idx = cycle.indexOf(complaint.status);
    complaint.status = cycle[(idx + 1) % cycle.length];
    saveComplaints(allComplaints);
    renderGrid();
  }

  function openModal(id) {
    const c = allComplaints.find(x => x.id === id);
    if (!c) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        ${c.image ? `<img class="modal-img" src="${c.image}" alt="Complaint image"/>` : ''}
        <div class="modal-body">
          <h2>${escapeHTML(c.name)}'s Complaint</h2>
          <div class="modal-row"><strong>Complaint ID</strong><span>${c.id}</span></div>
          <div class="modal-row"><strong>Category</strong><span>${escapeHTML(c.category)}</span></div>
          <div class="modal-row"><strong>Location</strong><span>${escapeHTML(c.location)}</span></div>
          ${c.ward ? `<div class="modal-row"><strong>Ward / Zone</strong><span>${escapeHTML(c.ward)}</span></div>` : ''}
          <div class="modal-row"><strong>Mobile</strong><span>${escapeHTML(c.phone)}</span></div>
          <div class="modal-row"><strong>Description</strong><span>${escapeHTML(c.description)}</span></div>
          <div class="modal-row"><strong>Status</strong><span>${c.status}</span></div>
          <div class="modal-row"><strong>Filed On</strong><span>${formatDate(c.timestamp)}</span></div>
        </div>
        <button class="modal-close">Close</button>
      </div>`;
    overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    activeModal = overlay;
  }

  // ── Filter buttons ──
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderGrid();
    });
  });

  // ── Search ──
  const searchBox = document.getElementById('adminSearch');
  if (searchBox) {
    searchBox.addEventListener('input', () => {
      searchQuery = searchBox.value;
      renderGrid();
    });
  }

  // ── Clear all ──
  const clearBtn = document.getElementById('clearAllBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('⚠️ This will permanently delete ALL complaints. Are you sure?')) {
        localStorage.removeItem(STORAGE_KEY);
        allComplaints = [];
        renderGrid();
      }
    });
  }

  // ── Refresh ──
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      allComplaints = loadComplaints();
      renderGrid();
      refreshBtn.textContent = '✓ Refreshed';
      setTimeout(() => refreshBtn.textContent = '↻ Refresh', 1500);
    });
  }

  // ── Escape helper ──
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ──
  renderGrid();

})();
// Dark Mode Toggle

const themeBtn = document.getElementById("themeToggle");

if (themeBtn) {

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeBtn.textContent = "☀️";
  }

  themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark");
      themeBtn.textContent = "☀️";
    } else {
      localStorage.setItem("theme", "light");
      themeBtn.textContent = "🌙";
    }

  });

}
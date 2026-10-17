/* UniVerse — demo app logic. Single-file render loop over a localStorage-backed state tree. */
(function () {
  'use strict';

  const STORAGE_KEY = 'universe_state_v3';

  const NAV = [
    { id: 'home', label: 'Home' },
    { id: 'community', label: 'Community' },
    { id: 'events', label: 'Campus Events' },
    { id: 'spotlight', label: 'Student Spotlight' },
    { id: 'professors', label: 'Rate My Professor' },
    { id: 'perks', label: 'UniVerse Perks' },
    { id: 'membership', label: 'Membership' },
    { id: 'profile', label: 'My Profile' },
  ];

  // ---------- utilities ----------
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function uid(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 9); }
  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // ---------- state ----------
  function defaultState() {
    return {
      loggedIn: true,
      me: {
        id: 'me', name: 'Alex Student', major: '', year: 'Freshman',
        bio: 'New here and finding my way around AURAK — say hi!',
        tier: 'free',
        privacy: { showMajor: true, showYear: true, showBusiness: true },
        adminDemo: true,
      },
      posts: clone(POSTS),
      professors: clone(PROFESSORS),
      events: clone(EVENTS),
      businesses: clone(BUSINESSES),
      channels: clone(CHAT_CHANNELS),
      notifications: clone(NOTIFICATIONS),
      myReactions: {}, // postId -> 'like' | 'dislike'
      discountCodesUsed: {},
    };
  }

  let state = loadState();
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable, demo continues in-memory */ }
  }

  // ephemeral UI state — not persisted
  const ui = {
    route: location.hash.replace('#', '') || 'home',
    openDropdown: null,
    modal: null,
    modalData: {},
    auth: { tab: 'login', step: 1, email: '', tier: 'free', draft: {} },
    businessCategory: 'All',
    eventView: 'list',
    profSearch: '', profDept: 'All', expandedProf: null,
    activeChannel: CHAT_CHANNELS[0].id,
    expandedComments: {},
    revealedCodes: {},
    toasts: [],
  };

  function isPremium() { return state.me.tier === 'premium'; }

  function toast(msg) {
    const id = uid('t');
    ui.toasts.push({ id, msg });
    rerender();
    setTimeout(() => { ui.toasts = ui.toasts.filter(t => t.id !== id); rerender(); }, 3200);
  }

  // ---------- lookups across seed + demo "me" ----------
  function authorById(id) {
    if (id === 'me') return { id: 'me', name: state.me.name || 'You', major: state.me.major, year: state.me.year, tier: state.me.tier };
    return studentById(id) || { id, name: 'Former Student', major: '', year: '', tier: 'free' };
  }
  function avatarHtml(author, size) {
    size = size || 36;
    const color = avatarColor(author.id);
    const ring = author.tier === 'premium' ? ' premium' : '';
    return `<span class="avatar-ring${ring}"><span class="avatar" style="width:${size}px;height:${size}px;background:${color};font-size:${size * 0.4}px">${escapeHtml(initialsOf(author.name))}</span></span>`;
  }
  function tierBadge(tier) {
    return tier === 'premium' ? '<span class="pill pill-accent">★ Premium</span>' : '<span class="pill pill-outline">Free</span>';
  }

  // ========================================================
  // RENDER
  // ========================================================
  function rerender() {
    const active = document.activeElement;
    const activeId = active && active.id;
    const selStart = active && 'selectionStart' in active ? active.selectionStart : null;
    const selEnd = active && 'selectionEnd' in active ? active.selectionEnd : null;
    const modalEl = document.querySelector('.modal');
    const modalScroll = modalEl ? modalEl.scrollTop : null;
    render();
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el) {
        el.focus();
        if (selStart !== null && el.setSelectionRange) { try { el.setSelectionRange(selStart, selEnd); } catch (e) {} }
      }
    }
    if (modalScroll !== null) {
      const newModal = document.querySelector('.modal');
      if (newModal) newModal.scrollTop = modalScroll;
    }
  }

  function render() {
    const root = document.getElementById('app');
    try {
      root.innerHTML = `
        <div class="star-field"></div>
        ${renderTopbar()}
        <main class="page-wrap">${renderPage()}</main>
        ${renderFooter()}
        ${ui.modal ? renderModal() : ''}
        <div class="toast-stack">${ui.toasts.map(t => `<div class="toast">${escapeHtml(t.msg)}</div>`).join('')}</div>
      `;
      saveState();
    } catch (e) {
      console.error('UniVerse render failed', e);
      root.innerHTML = `<div class="page-wrap"><div class="card card-pad" style="margin-top:40px">
        <h2 style="margin-top:0">Something went wrong</h2>
        <p class="muted">This page hit an error. Try going back to the home screen.</p>
        <button class="btn btn-primary" data-action="reset-app">Back to Home</button>
      </div></div>`;
    }
  }

  function renderTopbar() {
    const unread = state.notifications.filter(n => n.unread).length;
    return `
    <header class="topbar">
      <div class="topbar-inner">
        <button class="brand" data-action="nav" data-route="home">
          <img class="brand-mark" src="logo-icon.png" alt="UniVerse" /> <span class="brand-text">UniVerse</span>
        </button>
        <nav class="primary-nav">
          ${NAV.map(n => `<button class="${ui.route === n.id ? 'active' : ''}" data-action="nav" data-route="${n.id}">${n.label}</button>`).join('')}
        </nav>
        <div class="topbar-actions">
          <div style="position:relative">
            <button class="btn-icon nav-menu-btn" data-action="toggle-dropdown" data-which="navmenu" title="Menu">☰</button>
            ${ui.openDropdown === 'navmenu' ? renderNavMenuDropdown() : ''}
          </div>
          ${state.loggedIn ? `
            <div style="position:relative">
              <button class="btn-icon" data-action="toggle-dropdown" data-which="notif" title="Notifications">🔔${unread ? '<span class="badge-dot"></span>' : ''}</button>
              ${ui.openDropdown === 'notif' ? renderNotifDropdown() : ''}
            </div>
            <div style="position:relative">
              <button data-action="toggle-dropdown" data-which="profile" style="border:none;background:none;cursor:pointer;display:flex;align-items:center">${avatarHtml(authorById('me'), 34)}</button>
              ${ui.openDropdown === 'profile' ? renderProfileMenu() : ''}
            </div>
          ` : `
            <button class="btn btn-ghost btn-sm" data-action="open-auth" data-tab="login">Log In</button>
            <button class="btn btn-primary btn-sm" data-action="open-auth" data-tab="register">Join UniVerse</button>
          `}
        </div>
      </div>
    </header>`;
  }

  function renderNavMenuDropdown() {
    return `<div class="dropdown-panel align-left" style="width:220px">
      <div class="dropdown-head">Menu</div>
      <div>${NAV.map(n => `<button class="menu-item" data-action="nav" data-route="${n.id}">${n.label}</button>`).join('')}</div>
    </div>`;
  }

  function renderNotifDropdown() {
    return `<div class="dropdown-panel">
      <div class="dropdown-head">Notifications</div>
      <div class="dropdown-list">
        ${state.notifications.map(n => `<div class="dropdown-item ${n.unread ? 'unread' : ''}"><div>${escapeHtml(n.text)}</div><div class="muted" style="margin-top:4px;font-size:0.72rem">${escapeHtml(n.time)}</div></div>`).join('') || '<div class="dropdown-item muted">You\'re all caught up.</div>'}
      </div>
    </div>`;
  }

  function renderProfileMenu() {
    const me = state.me;
    return `<div class="dropdown-panel" style="width:260px">
      <div class="dropdown-head">${escapeHtml(me.name)} ${tierBadge(me.tier)}</div>
      <div>
        <button class="menu-item" data-action="nav" data-route="profile">👤 My Profile</button>
        <button class="menu-item" data-action="nav" data-route="chat">💬 Student Chat Channels</button>
        <button class="menu-item" data-action="nav" data-route="membership">💳 Membership &amp; Billing</button>
        <button class="menu-item" data-action="open-edit-profile">⚙️ Account Settings</button>
        <button class="menu-item" data-action="toggle-tier">🔁 Simulate: switch to ${isPremium() ? 'Free' : 'Premium'}</button>
        <button class="menu-item" data-action="nav" data-route="admin">🛠️ Admin Dashboard (demo)</button>
        <button class="menu-item" data-action="logout">🚪 Log Out</button>
      </div>
    </div>`;
  }

  function renderFooter() {
    return `<footer class="footer">
      <span>UniVerse — Your Campus. Your Community. Your UniVerse.</span>
      <span>A working prototype for ${CONFIG.SCHOOL_FULL}. Demo data only.</span>
    </footer>`;
  }

  function renderPage() {
    switch (ui.route) {
      case 'community': return pageCommunity();
      case 'events': return pageEvents();
      case 'spotlight': return pageSpotlight();
      case 'professors': return pageProfessors();
      case 'perks': return pagePerks();
      case 'membership': return pageMembership();
      case 'profile': return pageProfile();
      case 'admin': return pageAdmin();
      case 'chat': return pageChat();
      case 'auth': return pageAuth();
      default: return pageHome();
    }
  }

  // ---------------- HOME ----------------
  function pageHome() {
    const trending = [...state.posts].filter(p => p.status === 'approved').sort((a, b) => b.likes - a.likes).slice(0, 2);
    const upcoming = state.events.filter(e => e.status === 'approved').slice(0, 2);
    const featuredBiz = state.businesses.filter(b => b.featured && b.status === 'approved').slice(0, 2);
    const ratedProfs = state.professors.filter(p => realReviews(p).length > 0);
    const topProf = ratedProfs.length ? [...ratedProfs].sort((a, b) => avgRating(b) - avgRating(a))[0] : null;

    return `
    <section class="hero">
      <div class="hero-inner">
        <span class="eyebrow">${CONFIG.SCHOOL} · student community</span>
        <h1>Welcome to Your UniVerse.</h1>
        <p>Connect with students, discover campus life, support student businesses, and make the most of your AURAK experience — all in one place.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="open-auth" data-tab="register">Join UniVerse</button>
          <button class="btn btn-outline" data-action="nav" data-route="community">Explore the Community</button>
        </div>
      </div>
    </section>

    <section class="section freshmen-banner">
      <div>
        <span class="eyebrow">For the class just arriving</span>
        <h2>New to AURAK? Find Your People.</h2>
        <p class="muted" style="margin:0 0 16px">UniVerse exists so your first semester doesn't feel like a cold start. Here's where freshmen usually begin:</p>
        <ul class="freshmen-list">
          <li>🧭 <span><b>Freshmen Community chat</b> — ask the questions you're too shy to ask in lecture.</span></li>
          <li>🎉 <span><b>Campus Events</b> — the Welcome Mixer and other low-pressure ways to meet people.</span></li>
          <li>🏪 <span><b>Student Spotlight</b> — support (and maybe join) a classmate's small business.</span></li>
        </ul>
        <button class="btn btn-secondary btn-sm" data-action="nav" data-route="events">See what's on this week</button>
      </div>
      <div class="card card-pad">
        <span class="eyebrow">Free vs Premium</span>
        <h3 style="margin:8px 0 14px;font-size:1.1rem">What unlocks with Premium</h3>
        <ul class="feature-list">
          <li><span class="check-ico yes">✓</span> Comment on posts &amp; join chat channels</li>
          <li><span class="check-ico yes">✓</span> Publish posts &amp; promote your business</li>
          <li><span class="check-ico yes">✓</span> Unlock UniVerse Perks discount codes</li>
        </ul>
        <button class="btn btn-outline btn-sm" style="margin-top:14px" data-action="nav" data-route="membership">Compare full plans</button>
      </div>
    </section>

    <div class="divider-dots"><span></span><span></span><span></span></div>

    <section class="section">
      <div class="section-head"><h2>Trending in the Community</h2><button class="see-all" data-action="nav" data-route="community">See all →</button></div>
      <div class="grid grid-2">${trending.map(p => renderPostCard(p, { compact: true })).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Upcoming Campus Events</h2><button class="see-all" data-action="nav" data-route="events">See all →</button></div>
      <div class="grid grid-2">${upcoming.map(e => renderEventCard(e, { compact: true })).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Featured Student Businesses</h2><button class="see-all" data-action="nav" data-route="spotlight">See all →</button></div>
      <div class="grid grid-2">${featuredBiz.map(b => renderBusinessCard(b, { compact: true })).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Top-Rated on Rate My Professor</h2><button class="see-all" data-action="nav" data-route="professors">Browse all →</button></div>
      <div class="card card-pad">
        ${topProf ? `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <strong style="font-size:1.05rem">${escapeHtml(topProf.name)}</strong>
            <div class="muted" style="font-size:0.84rem">${escapeHtml(topProf.department)}</div>
          </div>
          <div class="stars">${starString(avgRating(topProf))} <span class="muted mono" style="margin-left:6px">${avgRating(topProf).toFixed(1)}</span></div>
        </div>` : `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <span class="muted">No professor ratings yet — real student reviews will appear here first.</span>
          <button class="btn btn-secondary btn-sm" data-action="nav" data-route="professors">Be the first to rate</button>
        </div>`}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>UniVerse Perks</h2><button class="see-all" data-action="nav" data-route="perks">See all →</button></div>
      <div class="grid grid-2">${PERKS.slice(0, 2).map(p => renderPerkCard(p, {})).join('')}</div>
    </section>
    `;
  }

  function starString(n) {
    const full = Math.round(n);
    return '★★★★★☆☆☆☆☆'.slice(5 - full, 10 - full);
  }

  // ---------------- COMMUNITY ----------------
  function pageCommunity() {
    const visible = state.posts.filter(p => p.status === 'approved' || p.authorId === 'me');
    return `
    <div class="section-head"><h2>Campus Community Feed</h2></div>
    <div class="card card-pad composer">
      ${avatarHtml(authorById('me'), 40)}
      <div style="flex:1">
        <div class="${isPremium() ? '' : 'locked'}">
          <textarea id="composer-text" placeholder="${isPremium() ? "Share something with campus…" : 'Upgrade to Premium to post in the community.'}" ${isPremium() ? '' : 'disabled'}></textarea>
        </div>
        <div class="composer-row">
          <span class="lock-note">${isPremium() ? 'Posts are checked by AI moderation before they appear publicly.' : '🔒 Free members can view, like and dislike — Premium can post and comment.'}</span>
          ${isPremium()
            ? `<button class="btn btn-primary btn-sm" data-action="submit-post">Post</button>`
            : `<button class="btn btn-outline btn-sm" data-action="open-auth" data-tab="register">Upgrade to Premium</button>`}
        </div>
      </div>
    </div>
    <div class="section" style="margin-top:24px;display:grid;gap:16px">
      ${visible.slice().reverse().map(p => renderPostCard(p, {})).join('')}
    </div>
    `;
  }

  function renderCommentRow(c) {
    const ca = authorById(c.authorId);
    const reviewTag = c.status === 'pending' ? ' <span class="pill pill-warning" style="margin-left:4px">Under review</span>' : '';
    return `<div class="comment">${avatarHtml(ca, 28)}<div class="comment-bubble"><b>${escapeHtml(ca.name)}</b><br>${escapeHtml(c.text)}${reviewTag}</div></div>`;
  }

  function renderCommentForm(postId) {
    if (isPremium()) {
      return `<div class="comment-form"><input id="comment-input-${postId}" placeholder="Write a comment…" /><button class="btn btn-secondary btn-sm" data-action="submit-comment" data-id="${postId}">Send</button></div>`;
    }
    return `<p class="lock-note">🔒 Premium members can comment — <button class="see-all" data-action="open-auth" data-tab="register">upgrade to join the discussion</button>.</p>`;
  }

  function renderPostComments(post, visibleComments) {
    const rows = visibleComments.map(renderCommentRow).join('') || '<p class="muted" style="font-size:0.84rem">No comments yet.</p>';
    return `<div class="comments">${rows}${renderCommentForm(post.id)}</div>`;
  }

  function renderPostActions(post, author, myReaction, commentsOpen, visibleComments) {
    const actions = `<div class="post-actions">
      <button class="react-btn ${myReaction === 'like' ? 'active' : ''}" data-action="react" data-id="${post.id}" data-kind="like">👍 ${post.likes}</button>
      <button class="react-btn ${myReaction === 'dislike' ? 'active' : ''}" data-action="react" data-id="${post.id}" data-kind="dislike">👎 ${post.dislikes}</button>
      <button class="react-btn" data-action="toggle-comments" data-id="${post.id}">💬 ${visibleComments.length}</button>
    </div>`;
    const comments = commentsOpen ? renderPostComments(post, visibleComments) : '';
    return actions + comments;
  }

  function renderPostCard(post, opts) {
    const author = authorById(post.authorId);
    const myReaction = state.myReactions[post.id];
    const commentsOpen = !!ui.expandedComments[post.id];
    const visibleComments = post.comments.filter(c => c.status === 'approved' || c.authorId === 'me');
    const majorPill = author.major ? `<span class="pill pill-outline">${escapeHtml(author.major)}</span>` : '';
    const reviewPill = post.status === 'pending' ? '<span class="pill pill-warning">Under review</span>' : '';
    const footer = opts.compact ? '' : renderPostActions(post, author, myReaction, commentsOpen, visibleComments);
    return `
    <article class="card card-pad post">
      ${avatarHtml(author, 40)}
      <div class="post-body">
        <div class="post-head">
          <span class="post-name">${escapeHtml(author.name)}</span>
          ${tierBadge(author.tier)}
          ${majorPill}
          <span class="post-meta">· ${escapeHtml(post.time)}</span>
          ${reviewPill}
        </div>
        <div class="post-text">${escapeHtml(post.text)}</div>
        ${footer}
      </div>
    </article>`;
  }

  // ---------------- EVENTS ----------------
  function pageEvents() {
    const approved = state.events.filter(e => e.status === 'approved' || e.submittedBy === 'me');
    const featured = approved.find(e => e.featured);
    const rest = approved.filter(e => e !== featured).sort((a, b) => a.date.localeCompare(b.date));
    return `
    <div class="section-head">
      <h2>Campus Events</h2>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="tab-row" style="margin:0">
          <button class="${ui.eventView === 'list' ? 'active' : ''}" data-action="set-event-view" data-view="list">List</button>
          <button class="${ui.eventView === 'calendar' ? 'active' : ''}" data-action="set-event-view" data-view="calendar">Calendar</button>
        </div>
        ${isPremium() ? `<button class="btn btn-primary btn-sm" data-action="open-event-form">Submit Event</button>` : `<button class="btn btn-outline btn-sm" data-action="open-auth" data-tab="register">Premium can submit events</button>`}
      </div>
    </div>
    ${featured ? `<div class="card card-pad" style="border-color:var(--accent);margin-bottom:20px">
      <span class="pill pill-accent">Featured</span>
      <h3 style="margin:10px 0 6px">${escapeHtml(featured.title)}</h3>
      <div class="muted tabular" style="margin-bottom:8px">${fmtDate(featured.date)} · ${escapeHtml(featured.time)} · ${escapeHtml(featured.location)}</div>
      <p style="margin:0">${escapeHtml(featured.desc)}</p>
    </div>` : ''}
    ${ui.eventView === 'list'
      ? `<div class="grid grid-3">${rest.map(e => renderEventCard(e, {})).join('')}</div>`
      : renderCalendar(approved)}
    `;
  }

  function renderEventCard(e, opts) {
    const color = avatarColor(e.id);
    return `<div class="card card-pad">
      <div class="event-image" style="background:linear-gradient(135deg, ${color}, var(--maroon))">${escapeHtml(e.category)}</div>
      <span class="pill pill-outline">${escapeHtml(e.category)}</span>
      ${e.status === 'pending' ? '<span class="pill pill-warning" style="margin-left:6px">Pending approval</span>' : ''}
      <h3 style="font-size:1.02rem;margin:10px 0 4px">${escapeHtml(e.title)}</h3>
      <div class="muted tabular" style="font-size:0.82rem;margin-bottom:8px">${fmtDate(e.date)} · ${escapeHtml(e.time)} · ${escapeHtml(e.location)}</div>
      ${opts.compact ? '' : `<p style="font-size:0.88rem;margin:0 0 12px">${escapeHtml(e.desc)}</p>
      <button class="btn btn-secondary btn-sm" data-action="rsvp" data-id="${e.id}">I'm interested</button>`}
    </div>`;
  }

  function renderCalendar(events) {
    const byDate = {};
    events.forEach(e => { (byDate[e.date] = byDate[e.date] || []).push(e); });
    const dates = Object.keys(byDate).sort();
    return `<div class="card card-pad">
      ${dates.map(d => `<div style="padding:10px 0;border-bottom:1px dashed var(--border)">
        <div class="eyebrow">${fmtDate(d)}</div>
        ${byDate[d].map(e => `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0">
          <span><b>${escapeHtml(e.title)}</b> <span class="muted">· ${escapeHtml(e.location)}</span></span>
          <span class="muted tabular">${escapeHtml(e.time)}</span>
        </div>`).join('')}
      </div>`).join('')}
    </div>`;
  }

  // ---------------- SPOTLIGHT ----------------
  function pageSpotlight() {
    const cats = ['All', ...BUSINESS_CATEGORIES];
    const list = state.businesses.filter(b => (b.status === 'approved' || b.ownerId === 'me') && (ui.businessCategory === 'All' || b.category === ui.businessCategory));
    return `
    <div class="section-head">
      <h2>Student Spotlight</h2>
      ${isPremium() ? `<button class="btn btn-primary btn-sm" data-action="open-business-form">List Your Business</button>` : `<button class="btn btn-outline btn-sm" data-action="open-auth" data-tab="register">Premium can list a business</button>`}
    </div>
    <p class="muted" style="margin-top:-8px">Support AURAK-owned businesses — cafés, shops and side hustles run by your classmates.</p>
    <div class="chip-row" style="margin-bottom:18px">
      ${cats.map(c => `<button class="chip ${ui.businessCategory === c ? 'active' : ''}" data-action="filter-business" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}
    </div>
    <div class="grid grid-3">${list.map(b => renderBusinessCard(b, {})).join('') || '<div class="empty-state"><div class="glyph">🏪</div>No businesses in this category yet.</div>'}</div>
    `;
  }

  function renderBusinessCard(b, opts) {
    const color = avatarColor(b.id);
    const owner = authorById(b.ownerId);
    return `<div class="card card-pad">
      <div class="business-image" style="background:linear-gradient(135deg, ${color}, var(--brown))">${escapeHtml(b.logo)}</div>
      <span class="pill pill-outline">${escapeHtml(b.category)}</span>
      ${b.status === 'pending' ? '<span class="pill pill-warning" style="margin-left:6px">Pending review</span>' : ''}
      <h3 style="font-size:1.02rem;margin:10px 0 4px">${escapeHtml(b.name)}</h3>
      <div class="muted" style="font-size:0.8rem;margin-bottom:8px">by ${escapeHtml(owner.name)} · ${escapeHtml(b.instagram)}</div>
      ${opts.compact ? '' : `<p style="font-size:0.88rem;margin:0 0 10px">${escapeHtml(b.desc)}</p>
      <div class="muted" style="font-size:0.8rem;margin-bottom:10px">📞 ${escapeHtml(b.contact)}</div>
      <div class="card card-pad" style="background:var(--surface-alt);border:none">
        <div style="font-size:0.84rem;font-weight:700;margin-bottom:6px">🎁 ${escapeHtml(b.offer)}</div>
        ${renderDiscountChip(b)}
      </div>`}
    </div>`;
  }

  function renderDiscountChip(b) {
    if (!isPremium()) {
      return `<div class="locked"><div class="blurred code-chip">${escapeHtml(b.discountCode)}</div><div class="lock-overlay"><span style="font-size:0.78rem">🔒 Premium only</span><button class="btn btn-outline btn-sm" data-action="open-auth" data-tab="register">Unlock with Premium</button></div></div>`;
    }
    return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="code-chip">${escapeHtml(b.discountCode)}</span><button class="btn btn-secondary btn-sm" data-action="copy-code" data-code="${escapeHtml(b.discountCode)}">Copy code</button><span class="muted" style="font-size:0.76rem">Expires ${fmtDate(b.discountExpires)}</span></div>`;
  }

  // ---------------- PROFESSORS ----------------
  function pageProfessors() {
    const depts = ['All', ...DEPARTMENTS];
    const list = state.professors.filter(p =>
      (ui.profDept === 'All' || p.department === ui.profDept) &&
      p.name.toLowerCase().includes(ui.profSearch.toLowerCase())
    );
    return `
    <div class="section-head"><h2>Rate My Professor</h2></div>
    <div class="card card-pad" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:18px">
      <input id="prof-search" style="flex:1;min-width:180px;border:1.5px solid var(--border);border-radius:999px;padding:9px 16px;background:var(--bg)" placeholder="Search professors by name…" value="${escapeHtml(ui.profSearch)}" oninput="" />
      <select id="prof-dept" style="border:1.5px solid var(--border);border-radius:999px;padding:9px 14px;background:var(--bg)">
        ${depts.map(d => `<option value="${escapeHtml(d)}" ${ui.profDept === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
      </select>
    </div>
    <div style="display:grid;gap:14px">${list.map(p => renderProfessorCard(p)).join('') || '<div class="empty-state"><div class="glyph">🔍</div>No professors match your search.</div>'}</div>
    `;
  }

  function renderProfessorCard(p) {
    const expanded = ui.expandedProf === p.id;
    const approved = realReviews(p);
    const rated = approved.length > 0;
    return `<div class="card card-pad">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;cursor:pointer" data-action="toggle-prof" data-id="${p.id}">
        <div>
          <strong style="font-size:1.05rem">${escapeHtml(p.name)}</strong>
          <div class="muted" style="font-size:0.84rem">${escapeHtml(p.department)}</div>
          <div class="chip-row" style="margin-top:8px">${p.courses.map(c => `<span class="pill pill-outline">${escapeHtml(c)}</span>`).join('')}</div>
        </div>
        <div style="text-align:right">
          ${rated ? `<div class="stars">${starString(avgRating(p))}</div><div class="muted" style="font-size:0.78rem">${approved.length} review${approved.length === 1 ? '' : 's'}</div>`
                  : `<span class="pill pill-outline">Not Yet Rated</span>`}
        </div>
      </div>
      ${expanded ? `
      <div style="margin-top:16px;padding-top:16px;border-top:1px dashed var(--border)">
        ${rated ? RATING_CATEGORIES.map(([key, label]) => `<div class="rating-row"><span>${label}</span><div class="rating-track"><div class="rating-fill" style="width:${avgRating(p, key) / 5 * 100}%"></div></div><span class="mono">${avgRating(p, key).toFixed(1)}</span></div>`).join('')
          : `<div class="card card-pad" style="background:var(--surface-alt);border:none;display:grid;gap:6px;font-size:0.86rem">
              <div><b>Exam Difficulty:</b> <span class="muted">Awaiting verified student ratings</span></div>
              <div><b>Teaching Style:</b> <span class="muted">Awaiting student feedback</span></div>
              <div><b>Helpfulness:</b> <span class="muted">Awaiting student feedback</span></div>
              <div><b>Office Hours:</b> <span class="muted">Contact professor or check AURAK's official schedule</span></div>
            </div>`}

        <div style="margin-top:16px">
          <div class="eyebrow" style="margin-bottom:8px">Sample reviews (fictional demo content)</div>
          <div style="display:grid;gap:10px">
            ${p.sampleReviews.map(r => `<div class="card card-pad" style="background:var(--surface-alt);border:none">
              <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
                <span class="stars" style="font-size:0.85rem">${starString(r.stars)}</span>
                <span class="pill pill-warning">Sample Review</span>
              </div>
              <p style="margin:6px 0 0;font-size:0.88rem">${escapeHtml(r.text)}</p>
            </div>`).join('')}
          </div>
          <p class="field-hint" style="margin-top:6px">Sample reviews are fictional demo content and are never counted toward a professor's rating.</p>
        </div>

        <div style="margin-top:16px">
          <div class="eyebrow" style="margin-bottom:8px">Student reviews</div>
          <div style="display:grid;gap:10px">
            ${approved.map(r => `<div class="card card-pad" style="background:var(--surface-alt);border:none">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                <b>${r.anonymous ? 'Anonymous student' : escapeHtml(authorById(r.authorId).name)}</b>
                <span class="stars" style="font-size:0.85rem">${starString(r.ratings.overall)}</span>
              </div>
              <div class="muted" style="font-size:0.76rem;margin-top:2px">${escapeHtml(r.course || '')}${r.semester ? ' · ' + escapeHtml(r.semester) : ''}</div>
              <p style="margin:6px 0 8px;font-size:0.88rem">${escapeHtml(r.text)}</p>
              <button class="see-all" style="font-size:0.72rem" data-action="report-review" data-prof="${p.id}" data-review="${r.id}">Report review</button>
            </div>`).join('') || '<p class="muted" style="font-size:0.84rem">No student reviews yet — be the first to share yours.</p>'}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:14px" data-action="open-review-form" data-prof="${p.id}">Write a review</button>
      </div>` : ''}
    </div>`;
  }

  // ---------------- PERKS ----------------
  function pagePerks() {
    const featured = PERKS.filter(p => p.featured);
    return `
    <div class="section-head"><h2>UniVerse Perks</h2></div>
    <p class="muted" style="margin-top:-8px">Exclusive student deals — unlocked for Premium members. All offers below are fictional demo content, not active business partnerships.</p>
    ${!isPremium() ? `<div class="card card-pad" style="margin:16px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;background:var(--surface-alt);border:none">
      <span>🔒 Unlock exclusive student deals for only ${premiumPriceLabel()}!</span>
      <button class="btn btn-primary btn-sm" data-action="open-auth" data-tab="register">Unlock with Premium</button>
    </div>` : ''}

    <div class="section-head" style="margin-top:28px"><h2 style="font-size:1.15rem">Featured Offers</h2></div>
    <div class="perks-carousel">${featured.map(p => renderPerkCard(p, { featured: true })).join('')}</div>

    <div class="section-head" style="margin-top:28px"><h2 style="font-size:1.15rem">All Perks</h2></div>
    <div class="grid grid-3">${PERKS.map(p => renderPerkCard(p, {})).join('')}</div>
    `;
  }

  function renderPerkCard(perk, opts) {
    const color = avatarColor(perk.id);
    return `<div class="card card-pad${opts.featured ? ' perk-featured' : ''}">
      <div class="business-image" style="background:linear-gradient(135deg, ${color}, var(--maroon));position:relative">
        ${escapeHtml(perk.logo)}
        <span class="pill pill-accent" style="position:absolute;top:10px;right:10px">${perk.discountPercent}% OFF</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px">
        <span class="pill pill-outline">${escapeHtml(perk.category)}</span>
        <span class="pill pill-warning">Demo Offer</span>
      </div>
      <h3 style="font-size:1.02rem;margin:10px 0 4px">${escapeHtml(perk.name)}</h3>
      <p style="font-size:0.88rem;margin:0 0 12px">${escapeHtml(perk.offer)}</p>
      ${renderPerkCode(perk)}
    </div>`;
  }

  function renderPerkCode(perk) {
    if (!isPremium()) {
      return `<div class="locked"><div class="blurred code-chip">${escapeHtml(perk.discountCode)}</div><div class="lock-overlay"><span style="font-size:0.78rem">🔒 Unlock exclusive student deals for only ${premiumPriceLabel()}!</span><button class="btn btn-outline btn-sm" data-action="open-auth" data-tab="register">Unlock with Premium</button></div></div>`;
    }
    if (!ui.revealedCodes[perk.id]) {
      return `<button class="btn btn-secondary btn-sm" data-action="reveal-code" data-id="${perk.id}">Reveal Code</button>`;
    }
    return `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="code-chip">${escapeHtml(perk.discountCode)}</span><button class="btn btn-secondary btn-sm" data-action="copy-code" data-code="${escapeHtml(perk.discountCode)}">Copy code</button></div>`;
  }

  // ---------------- MEMBERSHIP ----------------
  const MEMBERSHIP_MATRIX = [
    ['Student Profile', true, true],
    ['View Community Feed', true, true],
    ['Like and Dislike', true, true],
    ['View Campus Events', true, true],
    ['Rate My Professor', true, true],
    ['Comment on Posts', false, true],
    ['Student Chat Channels', false, true],
    ['Create Community Posts', false, true],
    ['Promote Student Business', false, true],
    ['Exclusive Discount Codes', false, true],
    ['Premium Badge', false, true],
  ];

  function pageMembership() {
    return `
    <div class="section-head"><h2>Membership</h2></div>
    <p class="muted" style="margin-top:-8px;max-width:60ch">Free gets you onto campus life. Premium gets you fully into it. Premium price is a single editable config value (<code>CONFIG.PREMIUM_PRICE</code>).</p>
    <div class="grid grid-2" style="margin-top:20px;align-items:stretch">
      <div class="card price-card">
        <span class="eyebrow">Free</span>
        <div class="price-tag">0 <span>${CONFIG.CURRENCY} / month</span></div>
        <ul class="feature-list">
          ${MEMBERSHIP_MATRIX.map(([label, free]) => `<li class="${free ? '' : 'no'}"><span class="check-ico ${free ? 'yes' : 'no'}">${free ? '✓' : '–'}</span> ${escapeHtml(label)}</li>`).join('')}
        </ul>
        <button class="btn btn-ghost" ${!isPremium() ? 'disabled' : ''} data-action="set-tier" data-tier="free">${isPremium() ? 'Switch to Free' : 'Your current plan'}</button>
      </div>
      <div class="card price-card featured">
        <span class="pill pill-accent" style="position:absolute;top:18px;right:18px">Most popular</span>
        <span class="eyebrow">Premium</span>
        <div class="price-tag">${CONFIG.PREMIUM_PRICE} <span>${CONFIG.CURRENCY} / month</span></div>
        <ul class="feature-list">
          ${MEMBERSHIP_MATRIX.map(([label]) => `<li><span class="check-ico yes">✓</span> ${escapeHtml(label)}</li>`).join('')}
        </ul>
        <button class="btn btn-primary" ${isPremium() ? 'disabled' : ''} data-action="set-tier" data-tier="premium">${isPremium() ? 'Your current plan' : `Upgrade for ${premiumPriceLabel()}`}</button>
      </div>
    </div>

    <div class="section-head" style="margin-top:36px"><h2 style="font-size:1.15rem">Compare plans</h2></div>
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Feature</th><th>Free</th><th>Premium — ${premiumPriceLabel()}</th></tr></thead>
        <tbody>
          ${MEMBERSHIP_MATRIX.map(([label, free]) => `<tr>
            <td>${escapeHtml(label)}</td>
            <td><span class="check-ico ${free ? 'yes' : 'no'}">${free ? '✓' : '✗'}</span></td>
            <td><span class="check-ico yes">✓</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
    <div style="text-align:center;margin-top:24px">
      <button class="btn btn-primary" style="padding:14px 34px;font-size:1rem" ${isPremium() ? 'disabled' : ''} data-action="set-tier" data-tier="premium">${isPremium() ? 'You\'re already Premium' : `Upgrade for ${premiumPriceLabel()}`}</button>
    </div>
    <p class="muted" style="font-size:0.8rem;margin-top:16px;text-align:center">Demo note: payment isn't wired up — upgrading instantly switches your simulated account so you can preview the experience. Real billing integration is still needed before launch.</p>
    `;
  }

  // ---------------- PROFILE ----------------
  function pageProfile() {
    const me = state.me;
    const myPosts = state.posts.filter(p => p.authorId === 'me');
    const myBiz = state.businesses.find(b => b.ownerId === 'me');
    return `
    <div class="section-head"><h2>My Profile</h2></div>
    <div class="grid" style="grid-template-columns: 300px 1fr;gap:20px;align-items:start">
      <div class="card card-pad" style="text-align:center">
        ${avatarHtml({ id: 'me', name: me.name, tier: me.tier }, 84)}
        <h3 style="margin:14px 0 2px">${escapeHtml(me.name || 'You')}</h3>
        ${tierBadge(me.tier)}
        ${me.privacy.showMajor && me.major ? `<div class="muted" style="margin-top:10px">${escapeHtml(me.major)}</div>` : ''}
        ${me.privacy.showYear ? `<div class="muted">${escapeHtml(me.year)}</div>` : ''}
        <p style="font-size:0.88rem;margin-top:12px">${escapeHtml(me.bio)}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:10px" data-action="open-edit-profile">Edit Profile</button>
      </div>
      <div style="display:grid;gap:20px">
        <div class="card card-pad">
          <h3 style="font-size:1rem;margin:0 0 12px">Privacy</h3>
          <label class="check-row"><input type="checkbox" data-action="toggle-privacy" data-field="showMajor" ${me.privacy.showMajor ? 'checked' : ''}/> Show my major on my profile</label>
          <label class="check-row"><input type="checkbox" data-action="toggle-privacy" data-field="showYear" ${me.privacy.showYear ? 'checked' : ''}/> Show my academic year</label>
          <label class="check-row"><input type="checkbox" data-action="toggle-privacy" data-field="showBusiness" ${me.privacy.showBusiness ? 'checked' : ''}/> Show my business listing</label>
        </div>
        <div class="card card-pad">
          <h3 style="font-size:1rem;margin:0 0 12px">My Posts</h3>
          ${myPosts.length ? myPosts.map(p => renderPostCard(p, { compact: true })).join('') : '<p class="muted" style="font-size:0.88rem">You haven\'t posted yet — Premium members can publish to the community feed.</p>'}
        </div>
        ${myBiz && me.privacy.showBusiness ? `<div class="card card-pad"><h3 style="font-size:1rem;margin:0 0 12px">My Business</h3>${renderBusinessCard(myBiz, {})}</div>` : ''}
      </div>
    </div>
    `;
  }

  // ---------------- CHAT ----------------
  function pageChat() {
    if (!isPremium()) {
      return `<div class="section-head"><h2>Student Chat Channels</h2></div>
      <div class="card card-pad" style="text-align:center;padding:48px">
        <div style="font-size:2rem;margin-bottom:10px">🔒</div>
        <h3>Chat channels are a Premium feature</h3>
        <p class="muted" style="max-width:48ch;margin:8px auto 18px">General Campus Chat, Freshmen Community, Study Groups, Events &amp; Activities, Student Entrepreneurs, and Questions &amp; Advice are waiting for you.</p>
        <button class="btn btn-primary" data-action="set-tier" data-tier="premium">Unlock with Premium</button>
      </div>`;
    }
    const channel = state.channels.find(c => c.id === ui.activeChannel) || state.channels[0];
    return `
    <div class="section-head"><h2>Student Chat Channels</h2></div>
    <div class="channel-layout">
      <div class="card card-pad channel-list">
        ${state.channels.map(c => `<button class="channel-item ${c.id === channel.id ? 'active' : ''}" data-action="set-channel" data-id="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
      </div>
      <div class="card card-pad chat-pane">
        <div><b>${escapeHtml(channel.name)}</b><div class="muted" style="font-size:0.8rem">${escapeHtml(channel.desc)}</div></div>
        <div class="chat-messages" style="margin-top:10px">
          ${channel.messages.map(m => {
            const a = authorById(m.authorId);
            return `<div style="display:flex;gap:10px">${avatarHtml(a, 30)}<div><div style="font-size:0.82rem"><b>${escapeHtml(a.name)}</b> <span class="muted">${escapeHtml(m.time)}</span></div><div class="comment-bubble" style="display:inline-block;margin-top:3px">${escapeHtml(m.text)}</div></div></div>`;
          }).join('')}
        </div>
        <div class="chat-input-row">
          <input id="chat-input" placeholder="Message #${escapeHtml(channel.name)}" />
          <button class="btn btn-primary btn-sm" data-action="send-chat" data-id="${channel.id}">Send</button>
        </div>
        <p class="muted" style="font-size:0.74rem;margin-top:8px">Report or block a member from their message (demo) · Moderators review flagged chats.</p>
      </div>
    </div>`;
  }

  // ---------------- ADMIN ----------------
  function pageAdmin() {
    const flaggedPosts = state.posts.filter(p => p.status === 'pending');
    const flaggedComments = state.posts.flatMap(p => p.comments.filter(c => c.status === 'pending').map(c => ({ ...c, postId: p.id })));
    const flaggedReviews = state.professors.flatMap(p => p.reviews.filter(r => r.status === 'pending' || r.reports > 0).map(r => ({ ...r, profId: p.id, profName: p.name })));
    const pendingEvents = state.events.filter(e => e.status === 'pending');
    const pendingBiz = state.businesses.filter(b => b.status === 'pending');
    const premiumCount = STUDENTS.filter(s => s.tier === 'premium').length + (isPremium() ? 1 : 0);

    return `
    <div class="admin-banner">🛠️ Demo Admin Dashboard — a preview of moderation and management tools, not gated by login in this prototype.</div>
    <div class="grid grid-4" style="margin-bottom:28px">
      <div class="card stat-tile"><span class="num tabular">${STUDENTS.length + 1}</span><span class="label">Registered students</span></div>
      <div class="card stat-tile"><span class="num tabular">${flaggedPosts.length + flaggedComments.length + flaggedReviews.length}</span><span class="label">Flagged for review</span></div>
      <div class="card stat-tile"><span class="num tabular">${pendingEvents.length}</span><span class="label">Events pending approval</span></div>
      <div class="card stat-tile"><span class="num tabular">${premiumCount}</span><span class="label">Premium members</span></div>
    </div>

    <div class="section-head"><h2>Moderation Queue</h2></div>
    <div class="card" style="margin-bottom:24px">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Type</th><th>Author</th><th>Content</th><th>Reason</th><th>Actions</th></tr></thead>
        <tbody>
          ${flaggedPosts.map(p => `<tr><td>Post</td><td>${escapeHtml(authorById(p.authorId).name)}</td><td style="max-width:260px">${escapeHtml(p.text).slice(0, 80)}</td><td class="muted">${escapeHtml(p.modReason || 'Flagged by AI moderation')}</td><td><button class="btn btn-secondary btn-sm" data-action="mod-approve" data-type="post" data-id="${p.id}">Approve</button> <button class="btn btn-ghost btn-sm" data-action="mod-reject" data-type="post" data-id="${p.id}">Reject</button></td></tr>`).join('')}
          ${flaggedComments.map(c => `<tr><td>Comment</td><td>${escapeHtml(authorById(c.authorId).name)}</td><td style="max-width:260px">${escapeHtml(c.text).slice(0, 80)}</td><td class="muted">${escapeHtml(c.modReason || 'Flagged by AI moderation')}</td><td><button class="btn btn-secondary btn-sm" data-action="mod-approve" data-type="comment" data-id="${c.id}" data-post="${c.postId}">Approve</button> <button class="btn btn-ghost btn-sm" data-action="mod-reject" data-type="comment" data-id="${c.id}" data-post="${c.postId}">Reject</button></td></tr>`).join('')}
          ${flaggedReviews.map(r => `<tr><td>Review</td><td>${r.anonymous ? 'Anonymous' : escapeHtml(authorById(r.authorId).name)}</td><td style="max-width:260px">${escapeHtml(r.text).slice(0, 80)} <span class="muted">(${escapeHtml(r.profName)})</span></td><td class="muted">${r.reports ? r.reports + ' report(s)' : 'Flagged by AI moderation'}</td><td><button class="btn btn-secondary btn-sm" data-action="mod-approve" data-type="review" data-id="${r.id}" data-post="${r.profId}">Approve</button> <button class="btn btn-ghost btn-sm" data-action="mod-reject" data-type="review" data-id="${r.id}" data-post="${r.profId}">Reject</button></td></tr>`).join('')}
          ${(!flaggedPosts.length && !flaggedComments.length && !flaggedReviews.length) ? '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Queue is empty — nothing waiting on a human.</td></tr>' : ''}
        </tbody>
      </table></div>
    </div>

    <div class="grid grid-2">
      <div>
        <div class="section-head"><h2>Pending Events</h2></div>
        <div class="card">
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Event</th><th>Submitted by</th><th>Actions</th></tr></thead>
            <tbody>
              ${pendingEvents.map(e => `<tr><td>${escapeHtml(e.title)}</td><td>${escapeHtml(authorById(e.submittedBy).name)}</td><td><button class="btn btn-secondary btn-sm" data-action="approve-event" data-id="${e.id}">Approve</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted" style="text-align:center;padding:20px">Nothing pending.</td></tr>'}
            </tbody>
          </table></div>
        </div>
      </div>
      <div>
        <div class="section-head"><h2>Pending Businesses</h2></div>
        <div class="card">
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Business</th><th>Owner</th><th>Actions</th></tr></thead>
            <tbody>
              ${pendingBiz.map(b => `<tr><td>${escapeHtml(b.name)}</td><td>${escapeHtml(authorById(b.ownerId).name)}</td><td><button class="btn btn-secondary btn-sm" data-action="approve-business" data-id="${b.id}">Approve</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted" style="text-align:center;padding:20px">Nothing pending.</td></tr>'}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>

    <div class="section-head" style="margin-top:28px"><h2>Discount Codes</h2></div>
    <div class="card">
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Business</th><th>Code</th><th>Expires</th></tr></thead>
        <tbody>
          ${state.businesses.filter(b => b.status === 'approved').map(b => `<tr><td>${escapeHtml(b.name)}</td><td class="mono">${escapeHtml(b.discountCode)}</td><td class="tabular">${fmtDate(b.discountExpires)}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </div>
    `;
  }

  // ========================================================
  // MODALS
  // ========================================================
  function renderModal() {
    switch (ui.modal) {
      case 'edit-profile': return modalEditProfile();
      case 'event-form': return modalEventForm();
      case 'business-form': return modalBusinessForm();
      case 'review-form': return modalReviewForm();
      default: return '';
    }
  }

  function modalWrap(title, inner) {
    return `<div class="modal-backdrop" data-action="close-modal-backdrop">
      <div class="modal" data-stop="1">
        <button class="btn-icon modal-close" data-action="close-modal">✕</button>
        <h3 style="margin:0 0 16px">${title}</h3>
        ${inner}
      </div>
    </div>`;
  }

  function authWrap(title, inner) {
    return `<div style="max-width:440px;margin:24px auto 0">
      <div class="card card-pad">
        <h2 style="margin:0 0 16px;font-size:1.3rem">${title}</h2>
        ${inner}
      </div>
    </div>`;
  }

  function pageAuth() {
    const tab = ui.auth.tab || 'login';
    const step = ui.auth.step || 1;
    const back = `<div style="max-width:440px;margin:16px auto 0"><button class="see-all" data-action="nav" data-route="home">← Back to Home</button></div>`;
    if (tab === 'login') {
      return back + authWrap('Log In to UniVerse', `
        <img src="logo-full.png" alt="UniVerse" class="auth-logo" />
        <div class="tab-row">
          <button class="active" data-action="auth-tab" data-tab="login">Log In</button>
          <button data-action="auth-tab" data-tab="register">Register</button>
        </div>
        <div class="field"><label>University Email</label><input id="login-email" placeholder="yourname${CONFIG.EMAIL_DOMAIN}"/></div>
        <div class="field"><label>Password</label><input type="password" id="login-pass" placeholder="••••••••"/></div>
        <button class="btn btn-primary" style="width:100%" data-action="do-login">Log In</button>
        <p class="field-hint" style="margin-top:10px">Demo login — any password works once your profile exists.</p>
      `);
    }
    // register flow
    if (step === 1) {
      return back + authWrap('Join UniVerse', `
        <img src="logo-full.png" alt="UniVerse" class="auth-logo" />
        <div class="tab-row">
          <button data-action="auth-tab" data-tab="login">Log In</button>
          <button class="active" data-action="auth-tab" data-tab="register">Register</button>
        </div>
        <span class="eyebrow">Step 1 of 3 — Verify your email</span>
        <div class="field" style="margin-top:10px"><label>AURAK University Email</label><input id="reg-email" placeholder="yourname${CONFIG.EMAIL_DOMAIN}"/></div>
        <p id="reg-email-error" class="field-hint" style="color:var(--danger)"></p>
        <button class="btn btn-primary" style="width:100%" data-action="reg-send-code">Send Verification Code</button>
      `);
    }
    if (step === 2) {
      return back + authWrap('Join UniVerse', `
        <span class="eyebrow">Step 2 of 3 — Enter your code</span>
        <p class="field-hint" style="margin:10px 0">We texted a 6-digit code to ${escapeHtml(ui.auth.email || '')}. (Demo: enter <b>123456</b>.)</p>
        <div class="field"><label>Verification Code</label><input id="reg-code" placeholder="123456"/></div>
        <p id="reg-code-error" class="field-hint" style="color:var(--danger)"></p>
        <button class="btn btn-primary" style="width:100%" data-action="reg-verify-code">Verify</button>
      `);
    }
    const draft = ui.auth.draft || {};
    const dName = draft.name !== undefined ? draft.name : state.me.name;
    const dMajor = draft.major !== undefined ? draft.major : '';
    const dYear = draft.year !== undefined ? draft.year : 'Freshman';
    const dBio = draft.bio !== undefined ? draft.bio : '';
    return back + authWrap('Join UniVerse', `
      <span class="eyebrow">Step 3 of 3 — Build your profile</span>
      <div class="field" style="margin-top:10px"><label>Display Name</label><input id="reg-name" value="${escapeHtml(dName)}"/></div>
      <div class="field-row">
        <div class="field"><label>Major (optional)</label><select id="reg-major"><option value="">— Undeclared —</option>${MAJORS.map(m => `<option ${dMajor === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="field"><label>Year (optional)</label><select id="reg-year">${YEARS.map(y => `<option ${dYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Short Bio</label><textarea id="reg-bio" placeholder="Tell campus a bit about you…">${escapeHtml(dBio)}</textarea></div>
      <div class="field"><label>Membership</label>
        <div class="tab-row" style="margin:0">
          <button class="${ui.auth.tier !== 'premium' ? 'active' : ''}" data-action="reg-set-tier" data-tier="free">Free</button>
          <button class="${ui.auth.tier === 'premium' ? 'active' : ''}" data-action="reg-set-tier" data-tier="premium">Premium (${premiumPriceLabel()})</button>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%" data-action="reg-finish">Create My Account</button>
    `);
  }

  function modalEditProfile() {
    const me = state.me;
    return modalWrap('Edit Profile', `
      <div class="field"><label>Display Name</label><input id="edit-name" value="${escapeHtml(me.name)}"/></div>
      <div class="field-row">
        <div class="field"><label>Major</label><select id="edit-major"><option value="">— Undeclared —</option>${MAJORS.map(m => `<option ${me.major === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="field"><label>Year</label><select id="edit-year">${YEARS.map(y => `<option ${me.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Bio</label><textarea id="edit-bio">${escapeHtml(me.bio)}</textarea></div>
      <button class="btn btn-primary" style="width:100%" data-action="save-profile">Save Changes</button>
    `);
  }

  function modalEventForm() {
    return modalWrap('Submit a Campus Event', `
      <div class="field"><label>Event Title</label><input id="ev-title" placeholder="e.g. Hackathon Kickoff"/></div>
      <div class="field-row">
        <div class="field"><label>Date</label><input id="ev-date" type="date"/></div>
        <div class="field"><label>Time</label><input id="ev-time" type="time"/></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Location</label><input id="ev-location" placeholder="e.g. Auditorium"/></div>
        <div class="field"><label>Category</label><select id="ev-category">${['Social', 'Freshmen', 'Workshop', 'Competition', 'Study Group'].map(c => `<option>${c}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Description</label><textarea id="ev-desc" placeholder="What should classmates know?"></textarea></div>
      <button class="btn btn-primary" style="width:100%" data-action="submit-event">Submit for Approval</button>
      <p class="field-hint" style="margin-top:10px">Admins review every submission before it appears publicly.</p>
    `);
  }

  function modalBusinessForm() {
    return modalWrap('List Your Business', `
      <div class="field"><label>Business Name</label><input id="biz-name" placeholder="e.g. RAK Bites"/></div>
      <div class="field-row">
        <div class="field"><label>Category</label><select id="biz-category">${BUSINESS_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Instagram</label><input id="biz-insta" placeholder="@yourbusiness"/></div>
      </div>
      <div class="field"><label>Description</label><textarea id="biz-desc" placeholder="What do you sell or offer?"></textarea></div>
      <div class="field"><label>Contact</label><input id="biz-contact" placeholder="Phone or WhatsApp"/></div>
      <div class="field"><label>Special Offer</label><input id="biz-offer" placeholder="e.g. 10% off first order"/></div>
      <button class="btn btn-primary" style="width:100%" data-action="submit-business">Submit for Review</button>
    `);
  }

  function modalReviewForm() {
    const profId = ui.modalData.profId;
    const prof = state.professors.find(p => p.id === profId);
    const ratings = ui.modalData.ratings || Object.fromEntries(RATING_CATEGORIES.map(([k]) => [k, 0]));
    const draftCourse = ui.modalData.draftCourse !== undefined ? ui.modalData.draftCourse : prof.courses[0];
    return modalWrap(`Review ${escapeHtml(prof.name)}`, `
      <div class="field"><label>Course Taken</label><select id="review-course">${prof.courses.map(c => `<option ${draftCourse === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Semester (optional)</label><input id="review-semester" placeholder="e.g. Fall 2026" value="${escapeHtml(ui.modalData.draftSemester || '')}"/></div>
      ${RATING_CATEGORIES.map(([key, label]) => `
        <div class="field">
          <label>${label}${key === 'examDifficulty' ? ' <span class="field-hint">(1 = Very Easy, 5 = Very Difficult)</span>' : ''}</label>
          <div class="star-picker" data-action="set-star" data-cat="${key}">
            ${[1, 2, 3, 4, 5].map(n => `<span data-star="${n}" class="${ratings[key] >= n ? 'filled' : ''}">★</span>`).join('')}
          </div>
        </div>`).join('')}
      <div class="field"><label>Your Review</label><textarea id="review-text" placeholder="Keep it respectful and focused on the academic experience.">${escapeHtml(ui.modalData.draftText || '')}</textarea></div>
      <label class="check-row"><input type="checkbox" id="review-anon" ${ui.modalData.draftAnon ? 'checked' : ''}/> Submit anonymously (your identity stays verified internally, but is hidden from other students)</label>
      <button class="btn btn-primary" style="width:100%" data-action="submit-review" data-prof="${profId}">Submit Review</button>
    `);
  }

  // ========================================================
  // ACTIONS
  // ========================================================
  function go(route) { ui.route = route; ui.openDropdown = null; location.hash = route; window.scrollTo({ top: 0 }); rerender(); }

  function handleAction(action, target, rawTarget) {
    const id = target.getAttribute('data-id');
    switch (action) {
      case 'nav': go(target.getAttribute('data-route')); break;
      case 'toggle-dropdown': {
        const which = target.getAttribute('data-which');
        ui.openDropdown = ui.openDropdown === which ? null : which;
        if (ui.openDropdown === 'notif') state.notifications.forEach(n => n.unread = false);
        rerender();
        break;
      }
      case 'open-auth': ui.auth = { tab: target.getAttribute('data-tab') || 'login', step: 1, email: '', tier: 'free', draft: {} }; ui.openDropdown = null; go('auth'); break;
      case 'auth-tab': ui.auth = { tab: target.getAttribute('data-tab'), step: 1, email: '', tier: 'free', draft: {} }; rerender(); break;
      case 'close-modal': ui.modal = null; ui.modalData = {}; rerender(); break;
      case 'close-modal-backdrop': if (rawTarget === target) { ui.modal = null; ui.modalData = {}; rerender(); } break;
      case 'toggle-tier': setTier(isPremium() ? 'free' : 'premium'); break;
      case 'set-tier': setTier(target.getAttribute('data-tier')); break;
      case 'logout': state.loggedIn = false; ui.openDropdown = null; toast('Logged out. Your profile stays saved on this device.'); break;
      case 'do-login': doLogin(); break;
      case 'reg-send-code': regSendCode(); break;
      case 'reg-verify-code': regVerifyCode(); break;
      case 'reg-set-tier': captureRegDraft(); ui.auth.tier = target.getAttribute('data-tier'); rerender(); break;
      case 'reg-finish': regFinish(); break;
      case 'react': reactToPost(id, target.getAttribute('data-kind')); break;
      case 'toggle-comments': ui.expandedComments[id] = !ui.expandedComments[id]; rerender(); break;
      case 'submit-post': submitPost(); break;
      case 'submit-comment': submitComment(id); break;
      case 'set-event-view': ui.eventView = target.getAttribute('data-view'); rerender(); break;
      case 'open-event-form': requirePremium(() => { ui.modal = 'event-form'; rerender(); }); break;
      case 'submit-event': submitEvent(); break;
      case 'rsvp': toast('Added to your events — a reminder will appear here closer to the date.'); break;
      case 'filter-business': ui.businessCategory = target.getAttribute('data-cat'); rerender(); break;
      case 'open-business-form': requirePremium(() => { ui.modal = 'business-form'; rerender(); }); break;
      case 'submit-business': submitBusiness(); break;
      case 'copy-code': copyCode(target.getAttribute('data-code')); break;
      case 'reveal-code': ui.revealedCodes[id] = true; rerender(); break;
      case 'toggle-prof': ui.expandedProf = ui.expandedProf === id ? null : id; rerender(); break;
      case 'open-review-form': ui.modal = 'review-form'; ui.modalData = { profId: target.getAttribute('data-prof'), ratings: Object.fromEntries(RATING_CATEGORIES.map(([k]) => [k, 0])) }; rerender(); break;
      case 'set-star': {
        const starEl = rawTarget && rawTarget.closest('span[data-star]');
        if (!starEl) break;
        const cat = target.getAttribute('data-cat');
        const n = +starEl.getAttribute('data-star');
        ui.modalData.ratings[cat] = n;
        const textEl = document.getElementById('review-text');
        const anonEl = document.getElementById('review-anon');
        const courseEl = document.getElementById('review-course');
        const semesterEl = document.getElementById('review-semester');
        if (textEl) ui.modalData.draftText = textEl.value;
        if (anonEl) ui.modalData.draftAnon = anonEl.checked;
        if (courseEl) ui.modalData.draftCourse = courseEl.value;
        if (semesterEl) ui.modalData.draftSemester = semesterEl.value;
        rerender(); break;
      }
      case 'submit-review': submitReview(target.getAttribute('data-prof')); break;
      case 'report-review': reportReview(target.getAttribute('data-prof'), target.getAttribute('data-review')); break;
      case 'open-edit-profile': ui.modal = 'edit-profile'; ui.openDropdown = null; rerender(); break;
      case 'save-profile': saveProfile(); break;
      case 'set-channel': ui.activeChannel = id; rerender(); break;
      case 'send-chat': sendChat(id); break;
      case 'mod-approve': modDecision(target, true); break;
      case 'mod-reject': modDecision(target, false); break;
      case 'approve-event': { const e = state.events.find(x => x.id === id); if (e) e.status = 'approved'; toast('Event approved and now public.'); rerender(); break; }
      case 'approve-business': { const b = state.businesses.find(x => x.id === id); if (b) b.status = 'approved'; toast('Business listing approved.'); rerender(); break; }
      case 'reset-app': { ui.route = 'home'; ui.modal = null; ui.modalData = {}; location.hash = 'home'; rerender(); break; }
      default: break;
    }
  }

  function requirePremium(fn) {
    if (isPremium()) fn(); else { toast('This is a Premium feature — switch tiers from the profile menu to preview it.'); }
  }

  function setTier(tier) {
    state.me.tier = tier;
    toast(tier === 'premium' ? 'Switched to Premium — chat, posting and perks are unlocked.' : 'Switched to Free.');
    rerender();
  }

  function captureRegDraft() {
    const name = document.getElementById('reg-name');
    const major = document.getElementById('reg-major');
    const year = document.getElementById('reg-year');
    const bio = document.getElementById('reg-bio');
    if (!name) return;
    ui.auth.draft = { name: name.value, major: major.value, year: year.value, bio: bio.value };
  }

  function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    if (!email) { toast('Enter your university email to continue.'); return; }
    state.loggedIn = true;
    toast(`Welcome back, ${state.me.name}!`);
    go('home');
  }

  function regSendCode() {
    const email = document.getElementById('reg-email').value.trim();
    const errEl = document.getElementById('reg-email-error');
    if (!email.toLowerCase().endsWith(CONFIG.EMAIL_DOMAIN)) {
      errEl.textContent = `Please use your ${CONFIG.EMAIL_DOMAIN} university email.`;
      return;
    }
    ui.auth.email = email;
    ui.auth.step = 2;
    rerender();
  }
  function regVerifyCode() {
    const code = document.getElementById('reg-code').value.trim();
    const errEl = document.getElementById('reg-code-error');
    if (code.length !== 6) { errEl.textContent = 'Enter the 6-digit code (demo: 123456).'; return; }
    ui.auth.step = 3;
    ui.auth.tier = ui.auth.tier || 'free';
    rerender();
  }
  function regFinish() {
    const name = document.getElementById('reg-name').value.trim() || 'New Student';
    const major = document.getElementById('reg-major').value;
    const year = document.getElementById('reg-year').value;
    const bio = document.getElementById('reg-bio').value.trim();
    state.me = { ...state.me, name, major, year, bio: bio || 'Say hi — I just joined UniVerse!', tier: ui.auth.tier || 'free' };
    state.loggedIn = true;
    toast('Welcome to UniVerse! Your student account is verified.');
    go('home');
  }

  function reactToPost(id, kind) {
    const post = state.posts.find(p => p.id === id);
    if (!post) return;
    const prev = state.myReactions[id];
    if (prev === 'like') post.likes--; if (prev === 'dislike') post.dislikes--;
    if (prev === kind) { delete state.myReactions[id]; }
    else { state.myReactions[id] = kind; if (kind === 'like') post.likes++; else post.dislikes++; }
    rerender();
  }

  function submitPost() {
    const text = document.getElementById('composer-text').value.trim();
    if (!text) return;
    const mod = moderateText(text);
    const post = { id: uid('post'), authorId: 'me', time: 'just now', text, likes: 0, dislikes: 0, status: mod.status, comments: [], modReason: mod.reason };
    state.posts.push(post);
    toast(mod.status === 'approved' ? 'Posted to the community feed.' : mod.reason);
    rerender();
  }

  function submitComment(postId) {
    const input = document.getElementById('comment-input-' + postId);
    const text = input.value.trim();
    if (!text) return;
    const post = state.posts.find(p => p.id === postId);
    const mod = moderateText(text);
    post.comments.push({ id: uid('cm'), authorId: 'me', text, status: mod.status, modReason: mod.reason });
    toast(mod.status === 'approved' ? 'Comment posted.' : mod.reason);
    rerender();
  }

  function submitEvent() {
    const title = document.getElementById('ev-title').value.trim();
    const date = document.getElementById('ev-date').value || '2026-12-01';
    const time = document.getElementById('ev-time').value || '12:00';
    const location = document.getElementById('ev-location').value.trim() || 'TBA';
    const category = document.getElementById('ev-category').value;
    const desc = document.getElementById('ev-desc').value.trim();
    if (!title) { toast('Give your event a title first.'); return; }
    state.events.push({ id: uid('e'), title, category, date, time, location, desc, featured: false, status: 'pending', submittedBy: 'me' });
    ui.modal = null;
    toast('Event submitted — pending admin approval.');
    rerender();
  }

  function submitBusiness() {
    const name = document.getElementById('biz-name').value.trim();
    const category = document.getElementById('biz-category').value;
    const instagram = document.getElementById('biz-insta').value.trim() || '@' + (name || 'yourbusiness').toLowerCase().replace(/\s+/g, '');
    const desc = document.getElementById('biz-desc').value.trim();
    const contact = document.getElementById('biz-contact').value.trim() || 'Message on Instagram';
    const offer = document.getElementById('biz-offer').value.trim() || 'Message for current offers';
    if (!name) { toast('Give your business a name first.'); return; }
    state.businesses.push({ id: uid('b'), ownerId: 'me', name, category, logo: initialsOf(name), desc, instagram, contact, offer, discountCode: (name.slice(0, 4) + '10').toUpperCase().replace(/[^A-Z0-9]/g, ''), discountExpires: '2026-12-31', status: 'pending', featured: false });
    ui.modal = null;
    toast('Listing submitted — pending admin review before it appears in Student Spotlight.');
    rerender();
  }

  function submitReview(profId) {
    const text = document.getElementById('review-text').value.trim();
    const anonymous = document.getElementById('review-anon').checked;
    const course = document.getElementById('review-course').value;
    const semester = document.getElementById('review-semester').value.trim();
    const ratings = ui.modalData.ratings;
    if (!text || Object.values(ratings).some(v => !v)) { toast('Rate every category and write a short review.'); return; }
    const prof = state.professors.find(p => p.id === profId);
    const mod = moderateText(text);
    prof.reviews.push({ id: uid('r'), authorId: 'me', anonymous, course, semester, ratings, text, status: mod.status, reports: 0, modReason: mod.reason });
    ui.modal = null;
    toast(mod.status === 'approved' ? 'Review published. Thanks for the feedback.' : mod.reason + ' You can appeal from your profile if this seems wrong.');
    rerender();
  }

  function reportReview(profId, reviewId) {
    const prof = state.professors.find(p => p.id === profId);
    const review = prof.reviews.find(r => r.id === reviewId);
    if (review) { review.reports = (review.reports || 0) + 1; toast('Reported — an admin will take a look.'); rerender(); }
  }

  function copyCode(code) {
    const done = () => toast(`Copied "${code}" to your clipboard.`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => toast(`Your code: ${code}`));
    } else { toast(`Your code: ${code}`); }
  }

  function saveProfile() {
    state.me.name = document.getElementById('edit-name').value.trim() || state.me.name;
    state.me.major = document.getElementById('edit-major').value;
    state.me.year = document.getElementById('edit-year').value;
    state.me.bio = document.getElementById('edit-bio').value.trim();
    ui.modal = null;
    toast('Profile updated.');
    rerender();
  }

  function sendChat(channelId) {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    const channel = state.channels.find(c => c.id === channelId);
    channel.messages.push({ authorId: 'me', text, time: 'now' });
    rerender();
  }

  function modDecision(target, approve) {
    const type = target.getAttribute('data-type');
    const id = target.getAttribute('data-id');
    if (type === 'post') {
      const p = state.posts.find(x => x.id === id);
      if (p) { if (approve) p.status = 'approved'; else state.posts = state.posts.filter(x => x.id !== id); }
    } else if (type === 'comment') {
      const postId = target.getAttribute('data-post');
      const post = state.posts.find(x => x.id === postId);
      if (post) { const c = post.comments.find(x => x.id === id); if (approve && c) c.status = 'approved'; else post.comments = post.comments.filter(x => x.id !== id); }
    } else if (type === 'review') {
      const profId = target.getAttribute('data-post');
      const prof = state.professors.find(x => x.id === profId);
      if (prof) { const r = prof.reviews.find(x => x.id === id); if (approve && r) { r.status = 'approved'; r.reports = 0; } else prof.reviews = prof.reviews.filter(x => x.id !== id); }
    }
    toast(approve ? 'Approved.' : 'Removed.');
    rerender();
  }

  // ========================================================
  // INIT
  // ========================================================
  document.addEventListener('click', e => {
    const actionEl = e.target.closest('[data-action]');
    const dropdownOpen = ui.openDropdown;
    if (!actionEl) {
      if (dropdownOpen && !e.target.closest('.dropdown-panel') && !e.target.closest('[data-action="toggle-dropdown"]')) {
        ui.openDropdown = null; rerender();
      }
      return;
    }
    handleAction(actionEl.getAttribute('data-action'), actionEl, e.target);
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'prof-search') { ui.profSearch = e.target.value; rerender(); }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'prof-dept') { ui.profDept = e.target.value; rerender(); }
    if (e.target.getAttribute && e.target.getAttribute('data-action') === 'toggle-privacy') {
      state.me.privacy[e.target.getAttribute('data-field')] = e.target.checked;
      rerender();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'chat-input') sendChat(ui.activeChannel);
    if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('comment-input-')) submitComment(e.target.id.replace('comment-input-', ''));
  });
  window.addEventListener('hashchange', () => { ui.route = location.hash.replace('#', '') || 'home'; render(); });

  render();
})();

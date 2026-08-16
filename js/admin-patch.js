// Lightweight patch script to fix admin UI runtime issues and add missing handlers.
// This runs after the main admin.js and attaches safe handlers.

document.addEventListener('DOMContentLoaded', () => {
  // Initialize sidebar navigation if not already initialized
  try {
    if (typeof initSidebarNav === 'function') initSidebarNav();
  } catch (e) { /* ignore */ }

  // Ensure adminActivityExport works even if main script had a broken handler
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest && ev.target.closest('#adminActivityExport');
    if (!btn) return;
    ev.preventDefault();
    try {
      const token = localStorage.getItem('friends_admin_token') || localStorage.getItem('friends_user_token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${window.location.origin}/api/admin/activity/export`, { headers });
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'activity_export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) {
      alert('فشل تصدير السجل');
    }
  });

});

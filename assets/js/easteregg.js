(() => {
  const secret = document.getElementById('adminEasterEgg');
  if (!secret) return;

  // Double-click the "1" in the heading to open the admin page.
  secret.style.cursor = 'pointer';
  secret.style.userSelect = 'none';
  secret.style.webkitUserSelect = 'none';
  secret.addEventListener('dblclick', event => {
    event.preventDefault();
    window.location.href = 'admin.html';
  });
})();

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

function badgeClass(result) {
  if (!result) return 'badge pending';
  const key = String(result).toLowerCase();
  return `badge ${['positive','neutral','negative'].includes(key) ? key : 'pending'}`;
}

function renderTopics(select) {
  const topics = (window.__EXAMPLE_TOPICS__ || []);
  select.innerHTML = '';
  for (const t of topics) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  }
}

function renderComments(list, comments) {
  list.innerHTML = '';
  for (const c of comments) {
    const item = document.createElement('div');
    item.className = 'comment';
    const name = c.author_name || 'Anonymous';
    const created = new Date(c.created_at).toLocaleString();
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
        <div style="font-weight:600;">${escapeHtml(name)}</div>
        <span class="${badgeClass(c.sentiment_result)}">${escapeHtml(c.sentiment_result)}</span>
      </div>
      <div class="muted" style="margin:6px 0;">Topic: ${escapeHtml(c.topic_id)} • ${escapeHtml(created)}</div>
      <div>${escapeHtml(c.text)}</div>
    `;
    list.appendChild(item);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadComments() {
  const list = document.getElementById('comments');
  const data = await fetchJSON('/api/comments');
  renderComments(list, data);
}

async function main() {
  const select = document.getElementById('topic_id');
  renderTopics(select);

  const form = document.getElementById('comment-form');
  const status = document.getElementById('form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    try {
      await fetchJSON('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      form.reset();
      renderTopics(select);
      status.textContent = 'Submitted!';
      await loadComments();
      setTimeout(() => status.textContent = '', 1200);
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
    }
  });

  await loadComments();
}

window.addEventListener('DOMContentLoaded', main);




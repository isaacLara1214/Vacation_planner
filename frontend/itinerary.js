const API_BASE_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentItinerary = null;

function checkAuth() {
  const userJson = sessionStorage.getItem('currentUser');
  if (!userJson) {
    window.location.href = 'login.html';
    return false;
  }
  currentUser = JSON.parse(userJson);
  const wm = document.getElementById('welcome-message');
  if (wm) wm.textContent = `Welcome, ${currentUser.Name}!`;
  return true;
}

function logout() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function formatDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

async function loadItinerary() {
  const id = getQueryParam('id');
  const container = document.getElementById('trip-details');
  if (!id) {
    container.innerHTML = '<p class="error">Missing itinerary id.</p>';
    return;
  }
  try {
    const resp = await fetch(`${API_BASE_URL}/itineraries/${id}`);
    if (!resp.ok) throw new Error(`Failed to load itinerary (${resp.status})`);
    const itinerary = await resp.json();
    // Basic guard to ensure this itinerary belongs to the current user
    if (itinerary.User_ID && itinerary.User_ID !== currentUser.User_ID) {
      container.innerHTML = '<p class="error">You do not have access to this itinerary.</p>';
      return;
    }
    currentItinerary = itinerary;
    renderDetails(itinerary);
    await loadDestinations(id);
    initDestinationUI(id);
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderDetails(it) {
  document.getElementById('trip-title').textContent = it.Trip_Name || 'Untitled Trip';
  document.getElementById('trip-dates').textContent = `${formatDate(it.Start_Date)} — ${formatDate(it.End_Date)}`;
  // Remove ID details below header; start page content with Destinations section.
  const container = document.getElementById('trip-details');
  container.innerHTML = '';
}

async function loadDestinations(itineraryId) {
  const container = document.getElementById('destinations-container');
  container.innerHTML = '<p>Loading destinations...</p>';
  try {
    const resp = await fetch(`${API_BASE_URL}/destinations/itinerary/${itineraryId}`);
    if (!resp.ok) throw new Error('Failed to load destinations');
    const list = await resp.json();
    renderDestinations(list);
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderDestinations(list) {
  const container = document.getElementById('destinations-container');
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = '<p>No destinations yet. Click "Add Destination" to create one.</p>';
    return;
  }
  container.innerHTML = '';
  list.forEach(d => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.setAttribute('data-destination-id', d.Destination_ID);
    
    // Left side: destination info
    const content = document.createElement('div');
    content.className = 'destination-content';
    const title = document.createElement('div');
    title.className = 'destination-title';
    title.textContent = `${d.City}, ${d.Country}`;
    const sub = document.createElement('div');
    sub.className = 'destination-sub';
    sub.textContent = d.Notes ? d.Notes : 'No notes';
    content.appendChild(title);
    content.appendChild(sub);
    
    // Right side: actions menu
    const actions = document.createElement('div');
    actions.className = 'destination-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEditDestination(d, card));
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteDestination(d.Destination_ID));
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    card.appendChild(content);
    card.appendChild(actions);
    // Placeholder for inline edit form
    const editFormContainer = document.createElement('div');
    editFormContainer.className = 'edit-form-placeholder';
    editFormContainer.style.display = 'none';
    card.appendChild(editFormContainer);
    container.appendChild(card);
  });
}

function initDestinationUI(itineraryId) {
  const openBtn = document.getElementById('add-destination-btn');
  const formContainer = document.getElementById('add-destination-form-container');
  const cancelBtn = document.getElementById('cancel-destination');
  const form = document.getElementById('destination-inline-form');

  openBtn.addEventListener('click', () => {
    // Close any edit forms
    document.querySelectorAll('.edit-form-placeholder').forEach(placeholder => {
      placeholder.style.display = 'none';
      placeholder.innerHTML = '';
    });
    document.querySelectorAll('.destination-card').forEach(card => {
      card.querySelector('.destination-content').style.display = '';
      card.querySelector('.destination-actions').style.display = '';
    });
    
    formContainer.style.display = 'block';
    document.getElementById('dest-city').value = '';
    document.getElementById('dest-country').value = '';
    document.getElementById('dest-notes').value = '';
    document.getElementById('save-destination-btn').textContent = 'Save Destination';
    document.getElementById('destination-error').style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
    form.reset();
    document.getElementById('destination-error').style.display = 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('destination-error');
    errorEl.style.display = 'none';
    const City = document.getElementById('dest-city').value.trim();
    const Country = document.getElementById('dest-country').value.trim();
    const Notes = document.getElementById('dest-notes').value.trim() || null;
    
    if (!City || !Country) {
      errorEl.textContent = 'City and Country are required.';
      errorEl.style.display = 'block';
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Itinerary_ID: itineraryId, City, Country, Notes })
      });
      if (!resp.ok) throw new Error('Failed to save destination');
      formContainer.style.display = 'none';
      form.reset();
      await loadDestinations(itineraryId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
}

// No modal close needed; inline form toggles visibility.

function openEditDestination(d, card) {
  // Hide any existing edit forms
  document.querySelectorAll('.edit-form-placeholder').forEach(placeholder => {
    placeholder.style.display = 'none';
    placeholder.innerHTML = '';
  });
  
  // Hide the destination info while editing
  const content = card.querySelector('.destination-content');
  const actions = card.querySelector('.destination-actions');
  content.style.display = 'none';
  actions.style.display = 'none';
  
  // Create inline edit form
  const editFormContainer = card.querySelector('.edit-form-placeholder');
  editFormContainer.style.display = 'block';
  editFormContainer.innerHTML = `
    <form class="inline-form edit-destination-form">
      <div class="form-row">
        <div class="form-field">
          <label>City</label>
          <input type="text" class="edit-city" value="${d.City || ''}" required>
        </div>
        <div class="form-field">
          <label>Country</label>
          <input type="text" class="edit-country" value="${d.Country || ''}" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-field" style="flex:1;">
          <label>Notes (optional)</label>
          <input type="text" class="edit-notes" value="${d.Notes || ''}" placeholder="Optional notes...">
        </div>
      </div>
      <div class="inline-error" style="display:none;"></div>
      <div class="inline-actions">
        <button type="button" class="secondary-btn cancel-edit">Cancel</button>
        <button type="submit" class="primary-btn">Update Destination</button>
      </div>
    </form>
  `;
  
  const form = editFormContainer.querySelector('form');
  const errorEl = editFormContainer.querySelector('.inline-error');
  
  // Cancel button
  form.querySelector('.cancel-edit').addEventListener('click', () => {
    editFormContainer.style.display = 'none';
    editFormContainer.innerHTML = '';
    content.style.display = '';
    actions.style.display = '';
  });
  
  // Submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const City = form.querySelector('.edit-city').value.trim();
    const Country = form.querySelector('.edit-country').value.trim();
    const Notes = form.querySelector('.edit-notes').value.trim() || null;
    
    if (!City || !Country) {
      errorEl.textContent = 'City and Country are required.';
      errorEl.style.display = 'block';
      return;
    }
    
    try {
      const itineraryId = getQueryParam('id');
      const resp = await fetch(`${API_BASE_URL}/destinations/${d.Destination_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ City, Country, Notes })
      });
      if (!resp.ok) throw new Error('Failed to update destination');
      await loadDestinations(itineraryId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
}

async function deleteDestination(id) {
  if (!confirm('Delete this destination?')) return;
  const itineraryId = getQueryParam('id');
  try {
    const resp = await fetch(`${API_BASE_URL}/destinations/${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete destination');
    await loadDestinations(itineraryId);
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  loadItinerary();
});
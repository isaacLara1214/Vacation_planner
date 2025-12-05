const API_BASE_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentItinerary = null;
// Cache of activities by ID to preserve fields during priority-only updates
let activityById = {};
// Leaflet map instance
let map = null;
let markers = [];
// Map activity IDs to their markers for click-to-highlight
let activityMarkerMap = {};
// Map destination IDs to their activity IDs for filtering
let destinationActivityMap = {};
// After creation, request scrolling to the new item
let pendingScroll = null; // 'destination' | 'activity'

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
  const loadingScreen = document.getElementById('loading-screen');
  
  if (!id) {
    container.innerHTML = '<p class="error">Missing itinerary id.</p>';
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => loadingScreen.style.display = 'none', 600);
    }
    return;
  }
  try {
    const resp = await fetch(`${API_BASE_URL}/itineraries/${id}`);
    if (!resp.ok) throw new Error(`Failed to load itinerary (${resp.status})`);
    const itinerary = await resp.json();
    // Basic guard to ensure this itinerary belongs to the current user
    if (itinerary.User_ID && itinerary.User_ID !== currentUser.User_ID) {
      container.innerHTML = '<p class="error">You do not have access to this itinerary.</p>';
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.style.display = 'none', 600);
      }
      return;
    }
    currentItinerary = itinerary;
    renderDetails(itinerary);
    initMap();
    await loadDestinations(id);
    await loadActivitiesForItinerary(id);
    initDestinationUI(id);
    initActivityUI(id);
    initBudgetAnalyzer(id);
    // Fade out loading screen after all content is loaded
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => loadingScreen.style.display = 'none', 600);
    }
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => loadingScreen.style.display = 'none', 600);
    }
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
    await renderDestinations(list);
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

async function renderDestinations(list) {
  const container = document.getElementById('destinations-container');
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = '<p>No destinations yet. Click "Add Destination" to create one.</p>';
    return;
  }
  container.innerHTML = '';
  
  // Load all accommodations in parallel for all destinations
  const accommodationPromises = list.map(d => {
    const card = document.createElement('div');
    card.className = 'destination-card';
    card.setAttribute('data-destination-id', d.Destination_ID);
    
    // Wrapper for destination header (content + actions)
    const headerWrapper = document.createElement('div');
    
    // Left side: destination info
    const content = document.createElement('div');
    content.className = 'destination-content';
    content.style.cursor = 'pointer';
    content.setAttribute('data-destination-id', d.Destination_ID);
    const title = document.createElement('div');
    title.className = 'destination-title';
    title.textContent = `${d.City}, ${d.Country}`;
    const sub = document.createElement('div');
    sub.className = 'destination-sub';
    sub.textContent = d.Notes ? d.Notes : 'No notes';
    content.appendChild(title);
    content.appendChild(sub);
    
    // Add click handler to show destination on map
    content.addEventListener('click', () => {
      showDestinationOnMap(d.Destination_ID);
    });
    
    // Right side: actions menu
    const actions = document.createElement('div');
    actions.className = 'destination-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering map navigation
      openEditDestination(d, card);
    });
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering map navigation
      deleteDestination(d.Destination_ID);
    });
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    headerWrapper.appendChild(content);
    headerWrapper.appendChild(actions);
    card.appendChild(headerWrapper);
    // Placeholder for inline edit form
    const editFormContainer = document.createElement('div');
    editFormContainer.className = 'edit-form-placeholder';
    editFormContainer.style.display = 'none';
    card.appendChild(editFormContainer);
    
    // Accommodations subsection
    const accomSection = document.createElement('div');
    accomSection.className = 'accommodation-section';
    accomSection.innerHTML = `
      <div class="subsection-header">
        <h4>Accommodations</h4>
        <button class="small-btn add-accommodation-btn" data-destination-id="${d.Destination_ID}">+ Add</button>
      </div>
      <div class="accommodation-list" data-destination-id="${d.Destination_ID}">
        <p class="loading-text">Loading...</p>
      </div>
      <div class="accommodation-form-container" data-destination-id="${d.Destination_ID}" style="display:none;">
        <form class="inline-form accommodation-form">
          <div class="form-row">
            <div class="form-field">
              <label>Name</label>
              <input type="text" class="accom-name" required>
            </div>
            <div class="form-field">
              <label>Cost</label>
              <input type="number" step="0.01" class="accom-cost" placeholder="0.00">
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Check In</label>
              <input type="date" class="accom-checkin" min="${currentItinerary.Start_Date.split('T')[0]}" max="${currentItinerary.End_Date.split('T')[0]}">
            </div>
            <div class="form-field">
              <label>Check Out</label>
              <input type="date" class="accom-checkout" min="${currentItinerary.Start_Date.split('T')[0]}" max="${currentItinerary.End_Date.split('T')[0]}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-field" style="flex:1;">
              <label>Address</label>
              <input type="text" class="accom-address" placeholder="Enter address..." required>
            </div>
          </div>
          <div class="inline-error" style="display:none;"></div>
          <div class="inline-actions">
            <button type="button" class="secondary-btn cancel-accom">Cancel</button>
            <button type="submit" class="primary-btn">Save Accommodation</button>
          </div>
        </form>
      </div>
    `;
    card.appendChild(accomSection);
    
    container.appendChild(card);
    
    // Return promise to load accommodations for this destination
    return loadAccommodations(d.Destination_ID);
  });
  
  // Wait for all accommodation loads to complete
  await Promise.all(accommodationPromises);

  // If a new destination was just added, scroll to the last card
  if (pendingScroll === 'destination') {
    const last = container.lastElementChild;
    if (last) {
      last.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    pendingScroll = null;
  }
}

function initDestinationUI(itineraryId) {
  const openBtn = document.getElementById('add-destination-btn');
  const formContainer = document.getElementById('add-destination-form-container');
  const cancelBtn = document.getElementById('cancel-destination');
  const form = document.getElementById('destination-inline-form');

  openBtn.addEventListener('click', () => {
    // Ensure section is expanded
    const block = document.querySelector('#destinations-block');
    const toggle = document.querySelector('.collapse-toggle[data-target="#destinations-block"]');
    if (block && block.classList.contains('collapsed')) {
      block.classList.remove('collapsed');
    }
    if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
      toggle.setAttribute('aria-expanded', 'true');
    }
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
    // Focus first field and scroll form into view
    const firstInput = document.getElementById('dest-city');
    if (firstInput) firstInput.focus();
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      pendingScroll = 'destination';
      await loadDestinations(itineraryId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
  
  // Wire up accommodation add buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-accommodation-btn')) {
      const destId = e.target.getAttribute('data-destination-id');
      const formContainer = document.querySelector(`.accommodation-form-container[data-destination-id="${destId}"]`);
      if (formContainer) {
        formContainer.style.display = 'block';
        formContainer.querySelector('.inline-error').style.display = 'none';
      }
    }
    
    if (e.target.classList.contains('cancel-accom')) {
      const formContainer = e.target.closest('.accommodation-form-container');
      if (formContainer) {
        formContainer.style.display = 'none';
        formContainer.querySelector('form').reset();
      }
    }
  });
  
  // Handle accommodation form submissions
  document.addEventListener('submit', async (e) => {
    if (e.target.classList.contains('accommodation-form')) {
      e.preventDefault();
      const form = e.target;
      const formContainer = form.closest('.accommodation-form-container');
      const destId = formContainer.getAttribute('data-destination-id');
      const errorEl = form.querySelector('.inline-error');
      errorEl.style.display = 'none';
      
      const Name = form.querySelector('.accom-name').value.trim();
      const Cost = form.querySelector('.accom-cost').value.trim() || null;
      const Check_In = form.querySelector('.accom-checkin').value || null;
      const Check_Out = form.querySelector('.accom-checkout').value || null;
      const Address = form.querySelector('.accom-address').value.trim();
      
      if (!Name) {
        errorEl.textContent = 'Name is required.';
        errorEl.style.display = 'block';
        return;
      }
      
      if (!Address) {
        errorEl.textContent = 'Address is required.';
        errorEl.style.display = 'block';
        return;
      }
      
      try {
        const resp = await fetch(`${API_BASE_URL}/accommodations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Destination_ID: destId, Name, Check_In, Check_Out, Cost, Address })
        });
        if (!resp.ok) throw new Error('Failed to save accommodation');
        formContainer.style.display = 'none';
        form.reset();
        await loadAccommodations(destId);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  });
  
  // Wire up activity add buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-activity-btn')) {
      const destId = e.target.getAttribute('data-destination-id');
      const formContainer = document.querySelector(`.activity-form-container[data-destination-id="${destId}"]`);
      if (formContainer) {
        formContainer.style.display = 'block';
        formContainer.querySelector('.inline-error').style.display = 'none';
      }
    }
    
    if (e.target.classList.contains('cancel-activity')) {
      const formContainer = e.target.closest('.activity-form-container');
      if (formContainer) {
        formContainer.style.display = 'none';
        formContainer.querySelector('form').reset();
      }
    }
  });
  
  // Handle activity form submissions
  document.addEventListener('submit', async (e) => {
    if (e.target.classList.contains('activity-form')) {
      e.preventDefault();
      const form = e.target;
      const formContainer = form.closest('.activity-form-container');
      const destId = formContainer.getAttribute('data-destination-id');
      const errorEl = form.querySelector('.inline-error');
      errorEl.style.display = 'none';
      
      const Name = form.querySelector('.activity-name').value.trim();
      const Category = form.querySelector('.activity-category').value.trim() || null;
      const Date = form.querySelector('.activity-date').value || null;
      const Cost = form.querySelector('.activity-cost').value.trim() || null;
      const Address = form.querySelector('.activity-address').value.trim() || null;
      
      if (!Name) {
        errorEl.textContent = 'Name is required.';
        errorEl.style.display = 'block';
        return;
      }
      
      try {
        const resp = await fetch(`${API_BASE_URL}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Destination_ID: destId, Name, Date, Cost, Category, Address, Priority: 999 })
        });
        if (!resp.ok) throw new Error('Failed to save activity');
        formContainer.style.display = 'none';
        form.reset();
        await loadActivities(destId);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    }
  });
}

function openEditActivityGlobal(activity, destinations) {
  const container = document.getElementById('activities-container');
  const item = Array.from(container.children).find(el => 
    el.getAttribute('data-activity-id') == activity.Activity_ID
  );
  if (!item) return;
  
  // Build destination options
  let destOptions = '<option value="">Select destination...</option>';
  destinations.forEach(d => {
    const selected = d.Destination_ID === activity.Destination_ID ? 'selected' : '';
    destOptions += `<option value="${d.Destination_ID}" ${selected}>${d.City}, ${d.Country}</option>`;
  });
  
  // Build category options
  const categories = ['Sightseeing', 'Nature', 'Dining', 'Nightlife', 'Entertainment', 'Culture', 'Shopping', 'Adventure', 'Wellness', 'Transport', 'Events'];
  let categoryOptions = '<option value="">Select category...</option>';
  categories.forEach(cat => {
    const selected = activity.Category === cat ? 'selected' : '';
    categoryOptions += `<option value="${cat}" ${selected}>${cat}</option>`;
  });
  
  item.innerHTML = `
    <form class="inline-form edit-activity-form" data-id="${activity.Activity_ID}">
      <div class="form-row">
        <div class="form-field">
          <label>Name</label>
          <input type="text" class="edit-activity-name" value="${activity.Name || ''}" required>
        </div>
        <div class="form-field">
          <label>Category</label>
          <select class="edit-activity-category">
            ${categoryOptions}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Destination</label>
          <select class="edit-activity-destination" required>
            ${destOptions}
          </select>
        </div>
        <div class="form-field">
          <label>Cost</label>
          <input type="number" step="0.01" class="edit-activity-cost" value="${activity.Cost || ''}" placeholder="0.00">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Date (optional)</label>
          <input type="date" class="edit-activity-date" value="${activity.Date ? activity.Date.split('T')[0] : ''}" min="${currentItinerary.Start_Date.split('T')[0]}" max="${currentItinerary.End_Date.split('T')[0]}">
        </div>
        <div class="form-field" style="flex:1;">
          <label>Address (optional)</label>
          <input type="text" class="edit-activity-address" value="${activity.Address || ''}" placeholder="Optional address...">
        </div>
      </div>
      <div class="inline-error" style="display:none;"></div>
      <div class="inline-actions">
        <button type="button" class="secondary-btn cancel-edit-activity">Cancel</button>
        <button type="submit" class="primary-btn">Update Activity</button>
      </div>
    </form>
  `;
  
  const form = item.querySelector('form');
  const errorEl = form.querySelector('.inline-error');
  
  form.querySelector('.cancel-edit-activity').addEventListener('click', () => {
    const itineraryId = getQueryParam('id');
    loadActivitiesForItinerary(itineraryId);
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    
    const Name = form.querySelector('.edit-activity-name').value.trim();
    const Category = form.querySelector('.edit-activity-category').value.trim() || null;
    const Destination_ID = form.querySelector('.edit-activity-destination').value;
    const Date = form.querySelector('.edit-activity-date').value || null;
    const Cost = form.querySelector('.edit-activity-cost').value.trim() || null;
    const Address = form.querySelector('.edit-activity-address').value.trim() || null;
    
    if (!Name || !Destination_ID) {
      errorEl.textContent = 'Name and Destination are required.';
      errorEl.style.display = 'block';
      return;
    }
    
    try {
      const resp = await fetch(`${API_BASE_URL}/activities/${activity.Activity_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name, Date, Cost, Category, Address, Destination_ID })
      });
      if (!resp.ok) throw new Error('Failed to update activity');
      const itineraryId = getQueryParam('id');
      await loadActivitiesForItinerary(itineraryId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
}

async function saveActivityExpense(activityId, amount, activityDate, category) {
  const itineraryId = getQueryParam('id');
  
  try {
    // Validate inputs
    if (!itineraryId) {
      throw new Error('No itinerary ID found');
    }
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    
    // Check if an expense already exists for this activity (by date and category)
    const resp = await fetch(`${API_BASE_URL}/expenses/itinerary/${itineraryId}`);
    let expenses = [];
    if (resp.ok) {
      expenses = await resp.json() || [];
    }
    
    // Find existing expense for this activity (using activity ID encoded in notes or category+date combo)
    const existingExpense = expenses.find(e => 
      e.Notes && e.Notes.includes(`activity_${activityId}`)
    );
    
    if (existingExpense) {
      // Update existing expense
      const updateResp = await fetch(`${API_BASE_URL}/expenses/${existingExpense.Expense_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Amount: amount,
          Category: category,
          Date: activityDate,
          Notes: `activity_${activityId}`
        })
      });
      if (!updateResp.ok) {
        const errorText = await updateResp.text();
        console.error('Update expense response:', errorText);
        throw new Error(`Failed to update expense: ${updateResp.status} ${updateResp.statusText}`);
      }
    } else {
      // Create new expense
      const payload = {
        Itinerary_ID: itineraryId,
        Amount: amount,
        Category: category,
        Date: activityDate,
        Notes: `activity_${activityId}`
      };
      
      console.log('Sending expense payload:', payload);
      
      const createResp = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!createResp.ok) {
        const errorText = await createResp.text();
        console.error('Create expense response:', createResp.status, errorText);
        throw new Error(`Failed to create expense: ${createResp.status} ${createResp.statusText} - ${errorText}`);
      }
    }
  } catch (err) {
    console.error('Error saving activity expense:', err);
    throw err;
  }
}

async function deleteActivityGlobal(activityId) {
  if (!confirm('Delete this activity?')) return;
  try {
    const resp = await fetch(`${API_BASE_URL}/activities/${activityId}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete activity');
    const itineraryId = getQueryParam('id');
    await loadActivitiesForItinerary(itineraryId);
  } catch (err) {
    alert(err.message);
  }
}

async function loadActivitiesForItinerary(itineraryId) {
  const container = document.getElementById('activities-container');
  container.innerHTML = '<p>Loading activities...</p>';
  try {
    // Get all destinations for this itinerary first
    const destResp = await fetch(`${API_BASE_URL}/destinations/itinerary/${itineraryId}`);
    if (!destResp.ok) throw new Error('Failed to load destinations for activities');
    const destinations = await destResp.json();
    
    // Fetch activities for all destinations
    const allActivities = [];
    for (const dest of destinations) {
      const actResp = await fetch(`${API_BASE_URL}/activities/destination/${dest.Destination_ID}`);
      if (actResp.ok) {
        const activities = await actResp.json();
        activities.forEach(a => {
          a.destinationName = `${dest.City}, ${dest.Country}`;
          a.Destination_ID = dest.Destination_ID;
        });
        allActivities.push(...activities);
      }
    }
    
    // Sort by date ascending; undated items go to the bottom
    allActivities.sort((a, b) => {
      const da = a.Date ? new Date(a.Date) : null;
      const db = b.Date ? new Date(b.Date) : null;
      if (da && db) return da - db;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });
    
    // Cache activities by id for later updates
    activityById = {};
    allActivities.forEach(a => { activityById[a.Activity_ID] = a; });

    renderActivitiesForItinerary(allActivities, destinations);
    await updateMapMarkers(allActivities, destinations);
    await renderDayToDay(allActivities);
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderActivitiesForItinerary(list, destinations) {
  const container = document.getElementById('activities-container');
  
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = '<p class="empty-text">No activities yet. Click "Add Activity" to create one.</p>';
    return;
  }
  
  container.innerHTML = '';
  list.forEach((a, index) => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.setAttribute('data-activity-id', a.Activity_ID);
    
    // Add clickable class if activity has address (will show on map)
    if (a.Address) {
      item.classList.add('has-map-marker');
    }
    
    item.innerHTML = `
      <div class="activity-info">
        <div class="activity-name">${a.Name}</div>
        <div class="activity-details">
          <span class="activity-destination-tag">${a.destinationName || 'Unknown'}</span>
          ${a.Category ? ' • ' + a.Category : ''}
          ${a.Date ? ' • ' + formatDate(a.Date) : ''}
          ${a.Cost ? ` • $${parseFloat(a.Cost).toFixed(2)}` : ''}
        </div>
        ${a.Address ? `<div class="activity-address">📍 ${a.Address}</div>` : ''}
      </div>
      <div class="activity-actions">
        <button class="small-action-btn edit-activity-btn" data-id="${a.Activity_ID}">Edit</button>
        <button class="small-action-btn delete-activity-btn" data-id="${a.Activity_ID}">Delete</button>
      </div>
    `;
    
    container.appendChild(item);
  });
  
  // Add click handlers to activity items with addresses to show on map
  container.querySelectorAll('.activity-item.has-map-marker').forEach(item => {
    // Click on the activity info area (not the buttons) to show on map
    const infoDiv = item.querySelector('.activity-info');
    infoDiv.addEventListener('click', () => {
      const activityId = item.getAttribute('data-activity-id');
      showActivityOnMap(activityId);
    });
  });
  
  // Drag-and-drop disabled; list is date-sorted
  
  // Wire up edit and delete buttons
  container.querySelectorAll('.edit-activity-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering map navigation
      const activityId = btn.getAttribute('data-id');
      const activity = list.find(a => a.Activity_ID == activityId);
      if (activity) openEditActivityGlobal(activity, destinations);
    });
  });
  
  container.querySelectorAll('.delete-activity-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering map navigation
      const activityId = btn.getAttribute('data-id');
      deleteActivityGlobal(activityId);
    });
  });

  // If a new activity was just added, scroll to the last item
  if (pendingScroll === 'activity') {
    const last = container.lastElementChild;
    if (last) {
      last.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    pendingScroll = null;
  }
}

// Drag-and-drop and priority update functions removed

// Calculate distance between two lat/lng points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Optimize routes by suggesting undated activities for existing days
async function optimizeRoutes(activities) {
  const datedActivities = activities.filter(a => a.Date && a.Address);
  const undatedActivities = activities.filter(a => !a.Date);
  
  if (undatedActivities.length === 0) {
    alert('No undated activities to optimize.');
    return null;
  }
  
  if (datedActivities.length === 0) {
    alert('No dated activities to optimize against. Please add dates to some activities first.');
    return null;
  }
  
  // Separate activities with and without addresses
  const undatedWithAddress = undatedActivities.filter(a => a.Address);
  const undatedWithoutAddress = undatedActivities.filter(a => !a.Address);
  
  // Get coordinates for all activities with addresses
  const activityCoords = {};
  for (const activity of [...datedActivities, ...undatedWithAddress]) {
    if (activity.Address) {
      let coords = geocodeCache[activity.Address];
      if (!coords) {
        await new Promise(resolve => setTimeout(resolve, 1100));
        coords = await geocodeLocation(activity.Address);
      }
      if (coords) {
        activityCoords[activity.Activity_ID] = coords;
      }
    }
  }
  
  // Group dated activities by date
  const activityByDate = {};
  datedActivities.forEach(activity => {
    const dateKey = activity.Date.split('T')[0];
    if (!activityByDate[dateKey]) {
      activityByDate[dateKey] = [];
    }
    activityByDate[dateKey].push(activity);
  });
  
  // For each undated activity with address, find the best day to add it to
  const suggestions = [];
  const unoptimizable = [...undatedWithoutAddress]; // Start with activities without addresses
  
  for (const undatedActivity of undatedWithAddress) {
    const undatedCoords = activityCoords[undatedActivity.Activity_ID];
    if (!undatedCoords) {
      unoptimizable.push(undatedActivity);
      continue;
    }
    
    let bestDay = null;
    let minAvgDistance = Infinity;
    
    // Check each day
    for (const [dateKey, dayActivities] of Object.entries(activityByDate)) {
      // Calculate average distance to all activities on this day
      const distances = [];
      for (const dayActivity of dayActivities) {
        const dayCoords = activityCoords[dayActivity.Activity_ID];
        if (dayCoords) {
          const dist = calculateDistance(
            undatedCoords.lat, undatedCoords.lng,
            dayCoords.lat, dayCoords.lng
          );
          distances.push(dist);
        }
      }
      
      if (distances.length > 0) {
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const minDistance = Math.min(...distances);
        
        // Use minimum distance as primary factor, average as secondary
        if (minDistance < minAvgDistance) {
          minAvgDistance = minDistance;
          bestDay = { dateKey, avgDistance, minDistance };
        }
      }
    }
    
    if (bestDay && bestDay.minDistance < 10) { // Only suggest if within 10km
      suggestions.push({
        activity: undatedActivity,
        suggestedDate: bestDay.dateKey,
        distance: bestDay.minDistance,
        avgDistance: bestDay.avgDistance
      });
    } else {
      unoptimizable.push(undatedActivity);
    }
  }
  
  return { suggestions, unoptimizable, sortedDates: Object.keys(activityByDate).sort() };
}

async function renderDayToDay(activities) {
  const container = document.getElementById('day-to-day-container');
  
  // Clear container first to prevent duplicates
  container.innerHTML = '';
  
  // Filter activities with dates
  const datedActivities = activities.filter(a => a.Date);
  
  if (datedActivities.length === 0) {
    container.innerHTML = '<p class="no-dated-activities">No activities with dates yet. Add dates to activities to see them in the day-to-day view.</p>';
    return;
  }
  
  // Fetch existing expenses for this itinerary
  let expenses = [];
  try {
    const itineraryId = getQueryParam('id');
    const resp = await fetch(`${API_BASE_URL}/expenses/itinerary/${itineraryId}`);
    if (resp.ok) {
      expenses = await resp.json() || [];
    }
  } catch (err) {
    console.error('Error fetching expenses:', err);
  }
  
  // Create a map of activity ID to expense amount for quick lookup
  const expenseMap = {};
  expenses.forEach(exp => {
    if (exp.Notes && typeof exp.Notes === 'string') {
      const match = exp.Notes.match(/activity_(\d+)/);
      if (match) {
        expenseMap[match[1]] = exp.Amount;
      }
    }
  });
  
  console.log('Day-to-day expenses loaded:', expenseMap);
  
  // Group activities by date
  const activityByDate = {};
  datedActivities.forEach(activity => {
    const dateKey = activity.Date.split('T')[0]; // Get just the date part
    if (!activityByDate[dateKey]) {
      activityByDate[dateKey] = [];
    }
    activityByDate[dateKey].push(activity);
  });
  
  // Sort dates
  const sortedDates = Object.keys(activityByDate).sort();
  
  // Add optimize button at top
  const optimizeContainer = document.createElement('div');
  optimizeContainer.style.marginBottom = '1rem';
  optimizeContainer.innerHTML = `
    <button id="optimize-routes-btn" class="primary-btn" style="width: 100%;">
      Optimize Routes - Suggest Undated Activities
    </button>
    <div id="route-suggestions" style="margin-top: 1rem;"></div>
  `;
  container.appendChild(optimizeContainer);
  
  // Wire up optimize button
  document.getElementById('optimize-routes-btn').addEventListener('click', async () => {
    const btn = document.getElementById('optimize-routes-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Analyzing routes...';
    
    try {
      const result = await optimizeRoutes(activities);
      const suggestionsContainer = document.getElementById('route-suggestions');
      
      if (!result) {
        return;
      }
      
      suggestionsContainer.innerHTML = '';
      
      if (result.suggestions.length === 0 && result.unoptimizable.length === 0) {
        suggestionsContainer.innerHTML = '<p class="no-suggestions">No undated activities found.</p>';
      } else {
        if (result.suggestions.length > 0) {
          renderRouteSuggestions(result.suggestions, activities);
        }
        if (result.unoptimizable.length > 0) {
          renderUnoptimizableActivities(result.unoptimizable, result.sortedDates, activities);
        }
      }
    } catch (err) {
      alert('Error optimizing routes: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Optimize Routes - Suggest Undated Activities';
    }
  });
  
  // Render each day
  sortedDates.forEach((dateKey, index) => {
    const dayActivities = activityByDate[dateKey];
    const date = new Date(dateKey + 'T00:00:00'); // Add time to avoid timezone issues
    const dayOfWeek = date.toLocaleDateString(undefined, { weekday: 'long' });
    const formattedDate = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    
    const dayGroup = document.createElement('div');
    dayGroup.className = 'day-group';
    dayGroup.setAttribute('data-date', dateKey);
    
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.innerHTML = `
      <div class="day-date">${dayOfWeek}, ${formattedDate}</div>
      <div class="day-count">${dayActivities.length} activit${dayActivities.length !== 1 ? 'ies' : 'y'}</div>
    `;
    
    const dayActivitiesContainer = document.createElement('div');
    dayActivitiesContainer.className = 'day-activities';
    
    dayActivities.forEach(activity => {
      const activityItem = document.createElement('div');
      activityItem.className = 'day-activity-item';
      activityItem.setAttribute('data-activity-id', activity.Activity_ID);
      
      if (activity.Address) {
        activityItem.classList.add('has-map-marker');
      }
      
      const budgetLabel = activity.Cost ? ` • Budget: $${parseFloat(activity.Cost).toFixed(2)}` : '';
      const existingExpense = expenseMap[activity.Activity_ID] || '';
      const expenseValue = existingExpense ? parseFloat(existingExpense).toFixed(2) : '';
      
      activityItem.innerHTML = `
        <div class="day-activity-content">
          <div class="day-activity-name">${activity.Name}</div>
          <div class="day-activity-details">
            <span class="activity-destination-tag">${activity.destinationName || 'Unknown'}</span>
            ${activity.Category ? ' • ' + activity.Category : ''}
            ${budgetLabel}
            ${activity.Address ? ' • 📍 ' + activity.Address : ''}
          </div>
          <div class="day-activity-expense-input">
            <label for="expense-${activity.Activity_ID}">Actual Spent:</label>
            <div class="expense-input-group">
              <span class="currency-symbol">$</span>
              <input 
                type="number" 
                id="expense-${activity.Activity_ID}" 
                class="actual-expense-input" 
                step="0.01" 
                min="0" 
                placeholder="0.00"
                value="${expenseValue}"
                data-activity-id="${activity.Activity_ID}"
              >
            </div>
          </div>
        </div>
        ${activity.Address ? `<button class="day-activity-map-btn" data-activity-id="${activity.Activity_ID}" title="Show on map">📍</button>` : ''}
      `;
      
      dayActivitiesContainer.appendChild(activityItem);
      
      // Wire up map button if present
      if (activity.Address) {
        const mapBtn = activityItem.querySelector('.day-activity-map-btn');
        if (mapBtn) {
          mapBtn.addEventListener('click', () => {
            showActivityOnMap(activity.Activity_ID);
          });
        }
      }
      
      // Wire up expense input with change event instead of blur
      const expenseInput = activityItem.querySelector(`#expense-${activity.Activity_ID}`);
      if (expenseInput) {
        expenseInput.addEventListener('change', async (e) => {
          const amount = e.target.value.trim();
          const itineraryId = getQueryParam('id');
          
          try {
            if (amount === '' || parseFloat(amount) === 0) {
              // If empty or zero, we might want to delete the expense
              if (expenseMap[activity.Activity_ID]) {
                // Delete existing expense
                const resp = await fetch(`${API_BASE_URL}/expenses/itinerary/${itineraryId}`);
                let expenses = [];
                if (resp.ok) {
                  expenses = await resp.json() || [];
                }
                const expenseToDelete = expenses.find(e => 
                  e.Notes && e.Notes.includes(`activity_${activity.Activity_ID}`)
                );
                if (expenseToDelete) {
                  await fetch(`${API_BASE_URL}/expenses/${expenseToDelete.Expense_ID}`, {
                    method: 'DELETE'
                  });
                }
                delete expenseMap[activity.Activity_ID];
              }
            } else {
              // Save or update expense
              // Extract just the date part (YYYY-MM-DD) from activity.Date
              const dateOnly = activity.Date ? activity.Date.split('T')[0] : null;
              await saveActivityExpense(activity.Activity_ID, parseFloat(amount), dateOnly, activity.Category || 'Other');
              expenseMap[activity.Activity_ID] = amount;
            }
            // Update budget display after saving
            await updateBudgetDisplay(itineraryId);
          } catch (err) {
            alert('Failed to save expense: ' + err.message);
            // Reset the value on error
            e.target.value = expenseValue;
          }
        });
      }
    });
    
    dayGroup.appendChild(dayHeader);
    dayGroup.appendChild(dayActivitiesContainer);
    container.appendChild(dayGroup);
  });
}

function renderRouteSuggestions(suggestions, activities) {
  const container = document.getElementById('route-suggestions');
  container.innerHTML = '<h4 style="margin-bottom: 0.75rem; font-size: 0.95rem; color: #2c3e50;">📍 Route Optimization Suggestions</h4>';
  
  // Group suggestions by date
  const suggestionsByDate = {};
  suggestions.forEach(sug => {
    if (!suggestionsByDate[sug.suggestedDate]) {
      suggestionsByDate[sug.suggestedDate] = [];
    }
    suggestionsByDate[sug.suggestedDate].push(sug);
  });
  
  // Render suggestions grouped by day
  for (const [dateKey, daySuggestions] of Object.entries(suggestionsByDate)) {
    const date = new Date(dateKey + 'T00:00:00');
    const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    const dateGroup = document.createElement('div');
    dateGroup.className = 'suggestion-date-group';
    dateGroup.innerHTML = `<div class="suggestion-date-header">${formattedDate}</div>`;
    
    daySuggestions.forEach(sug => {
      const suggestionCard = document.createElement('div');
      suggestionCard.className = 'suggestion-card';
      suggestionCard.innerHTML = `
        <div class="suggestion-content">
          <div class="suggestion-activity-name">${sug.activity.Name}</div>
          <div class="suggestion-details">
            <span class="activity-destination-tag">${sug.activity.destinationName}</span>
            ${sug.activity.Category ? ' • ' + sug.activity.Category : ''}
            • ${sug.distance.toFixed(1)}km away
          </div>
          ${sug.activity.Address ? `<div class="suggestion-address">📍 ${sug.activity.Address}</div>` : ''}
        </div>
        <div class="suggestion-actions">
          <button class="suggestion-accept-btn" data-activity-id="${sug.activity.Activity_ID}" data-date="${dateKey}" title="Add to this day">✓</button>
          <button class="suggestion-reject-btn" data-activity-id="${sug.activity.Activity_ID}" title="Dismiss">✕</button>
        </div>
      `;
      dateGroup.appendChild(suggestionCard);
    });
    
    container.appendChild(dateGroup);
  }
  
  // Wire up accept buttons
  container.querySelectorAll('.suggestion-accept-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const activityId = btn.getAttribute('data-activity-id');
      const date = btn.getAttribute('data-date');
      await acceptSuggestion(activityId, date);
    });
  });
  
  // Wire up reject buttons
  container.querySelectorAll('.suggestion-reject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.suggestion-card');
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);
    });
  });
}

function renderUnoptimizableActivities(unoptimizable, sortedDates, activities) {
  const container = document.getElementById('route-suggestions');
  
  // Add section header
  const header = document.createElement('h4');
  header.style.cssText = 'margin-top: 1.5rem; margin-bottom: 0.75rem; font-size: 0.95rem; color: #2c3e50;';
  header.textContent = '⚠️ Activities Requiring Manual Assignment';
  container.appendChild(header);
  
  const infoText = document.createElement('p');
  infoText.style.cssText = 'font-size: 0.85rem; color: #6b7280; margin-bottom: 0.75rem;';
  infoText.textContent = 'These activities are too far from existing days or lack addresses. Choose a date to add them:';
  container.appendChild(infoText);
  
  // Render each unoptimizable activity
  unoptimizable.forEach(activity => {
    const activityCard = document.createElement('div');
    activityCard.className = 'unoptimizable-card';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'unoptimizable-content';
    contentDiv.innerHTML = `
      <div class="unoptimizable-activity-name">${activity.Name}</div>
      <div class="unoptimizable-details">
        <span class="activity-destination-tag">${activity.destinationName}</span>
        ${activity.Category ? ' • ' + activity.Category : ''}
        ${!activity.Address ? ' • No address' : ''}
      </div>
      ${activity.Address ? `<div class="unoptimizable-address">📍 ${activity.Address}</div>` : ''}
    `;
    
    const selectDiv = document.createElement('div');
    selectDiv.className = 'unoptimizable-select';
    
    const datePicker = document.createElement('input');
    datePicker.type = 'date';
    datePicker.className = 'day-select';
    datePicker.min = currentItinerary.Start_Date.split('T')[0];
    datePicker.max = currentItinerary.End_Date.split('T')[0];
    
    const assignBtn = document.createElement('button');
    assignBtn.className = 'assign-btn';
    assignBtn.textContent = 'Assign';
    assignBtn.disabled = true;
    
    datePicker.addEventListener('change', () => {
      assignBtn.disabled = !datePicker.value;
    });
    
    assignBtn.addEventListener('click', async () => {
      const selectedDate = datePicker.value;
      if (selectedDate) {
        await acceptSuggestion(activity.Activity_ID, selectedDate);
      }
    });
    
    selectDiv.appendChild(datePicker);
    selectDiv.appendChild(assignBtn);
    
    activityCard.appendChild(contentDiv);
    activityCard.appendChild(selectDiv);
    container.appendChild(activityCard);
  });
}

async function acceptSuggestion(activityId, date) {
  try {
    // Get the activity details from activityById cache
    const activity = activityById[activityId];
    if (!activity) {
      alert('Activity not found.');
      return;
    }
    
    // Update activity with the suggested date
    const resp = await fetch(`${API_BASE_URL}/activities/${activityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Name: activity.Name,
        Date: date,
        Cost: activity.Cost,
        Category: activity.Category,
        Address: activity.Address,
        Destination_ID: activity.Destination_ID
      })
    });
    
    if (!resp.ok) throw new Error('Failed to update activity');
    
    // Reload activities to show updated view
    const itineraryId = getQueryParam('id');
    await loadActivitiesForItinerary(itineraryId);
    
    // Show success message
    const card = document.querySelector(`[data-activity-id="${activityId}"]`).closest('.suggestion-card');
    if (card) {
      card.style.background = '#d1fae5';
      card.innerHTML = '<div style="padding: 8px; color: #065f46; font-weight: 600;">✓ Activity added to day!</div>';
      setTimeout(() => card.remove(), 2000);
    }
  } catch (err) {
    alert('Error accepting suggestion: ' + err.message);
  }
}

function initActivityUI(itineraryId) {
  const openBtn = document.getElementById('add-activity-btn');
  const formContainer = document.getElementById('add-activity-form-container');
  const cancelBtn = document.getElementById('cancel-activity');
  const form = document.getElementById('activity-inline-form');
  
  openBtn.addEventListener('click', async () => {
    // Ensure section is expanded
    const block = document.querySelector('#activities-block');
    const toggle = document.querySelector('.collapse-toggle[data-target="#activities-block"]');
    if (block && block.classList.contains('collapsed')) {
      block.classList.remove('collapsed');
    }
    if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
      toggle.setAttribute('aria-expanded', 'true');
    }
    // Populate destination dropdown
    const select = document.getElementById('activity-destination');
    try {
      const resp = await fetch(`${API_BASE_URL}/destinations/itinerary/${itineraryId}`);
      const destinations = await resp.json();
      select.innerHTML = '<option value="">Select destination...</option>';
      destinations.forEach(d => {
        const option = document.createElement('option');
        option.value = d.Destination_ID;
        option.textContent = `${d.City}, ${d.Country}`;
        select.appendChild(option);
      });
      
      // If there's only one destination, set it as default
      if (destinations.length === 1) {
        select.value = destinations[0].Destination_ID;
      }
    } catch (err) {
      console.error('Failed to load destinations:', err);
    }
    
    formContainer.style.display = 'block';
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-category').value = '';
    if (select.options.length > 2) {
      // Only reset if there's more than one destination (plus the placeholder)
      document.getElementById('activity-destination').value = '';
    }
    document.getElementById('activity-cost').value = '';
    const activityDateInput = document.getElementById('activity-date');
    activityDateInput.value = '';
    activityDateInput.min = currentItinerary.Start_Date.split('T')[0];
    activityDateInput.max = currentItinerary.End_Date.split('T')[0];
    document.getElementById('activity-address').value = '';
    document.getElementById('activity-error').style.display = 'none';
    // Focus first field and scroll form into view
    const firstInput = document.getElementById('activity-name');
    if (firstInput) firstInput.focus();
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  
  cancelBtn.addEventListener('click', () => {
    formContainer.style.display = 'none';
    form.reset();
    document.getElementById('activity-error').style.display = 'none';
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('activity-error');
    errorEl.style.display = 'none';
    
    const Name = document.getElementById('activity-name').value.trim();
    const Category = document.getElementById('activity-category').value.trim() || null;
    const Destination_ID = document.getElementById('activity-destination').value;
    const Cost = document.getElementById('activity-cost').value.trim() || null;
    const Date = document.getElementById('activity-date').value || null;
    const Address = document.getElementById('activity-address').value.trim() || null;
    
    if (!Name || !Destination_ID) {
      errorEl.textContent = 'Name and Destination are required.';
      errorEl.style.display = 'block';
      return;
    }
    
    try {
      const resp = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Destination_ID, Name, Date, Cost, Category, Address })
      });
      if (!resp.ok) throw new Error('Failed to save activity');
      formContainer.style.display = 'none';
      form.reset();
      pendingScroll = 'activity';
      await loadActivitiesForItinerary(itineraryId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
}

async function loadAccommodations(destinationId) {
  const listContainer = document.querySelector(`.accommodation-list[data-destination-id="${destinationId}"]`);
  if (!listContainer) return;
  
  try {
    const resp = await fetch(`${API_BASE_URL}/accommodations/destination/${destinationId}`);
    if (!resp.ok) throw new Error('Failed to load accommodations');
    const list = await resp.json();
    renderAccommodations(destinationId, list);
  } catch (err) {
    listContainer.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderAccommodations(destinationId, list) {
  const listContainer = document.querySelector(`.accommodation-list[data-destination-id="${destinationId}"]`);
  if (!listContainer) return;
  
  if (!Array.isArray(list) || list.length === 0) {
    listContainer.innerHTML = '<p class="empty-text">No accommodations yet.</p>';
    return;
  }
  
  listContainer.innerHTML = '';
  list.forEach(a => {
    const item = document.createElement('div');
    item.className = 'accommodation-item';
    item.innerHTML = `
      <div class="accommodation-info">
        <div class="accommodation-name">${a.Name}</div>
        <div class="accommodation-details">
          ${a.Check_In ? formatDate(a.Check_In) : ''} ${a.Check_In && a.Check_Out ? '→' : ''} ${a.Check_Out ? formatDate(a.Check_Out) : ''}
          ${a.Cost ? ` • $${parseFloat(a.Cost).toFixed(2)}` : ''}
        </div>
        ${a.Address ? `<div class="accommodation-address">${a.Address}</div>` : ''}
      </div>
      <div class="accommodation-actions">
        <button class="small-action-btn edit-accom-btn" data-id="${a.Accommodation_ID}">Edit</button>
        <button class="small-action-btn delete-accom-btn" data-id="${a.Accommodation_ID}">Delete</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
  
  // Wire up edit and delete buttons
  listContainer.querySelectorAll('.edit-accom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const accomId = btn.getAttribute('data-id');
      const accom = list.find(a => a.Accommodation_ID == accomId);
      if (accom) openEditAccommodation(destinationId, accom);
    });
  });
  
  listContainer.querySelectorAll('.delete-accom-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const accomId = btn.getAttribute('data-id');
      deleteAccommodation(destinationId, accomId);
    });
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
  // Get count of activities for this destination to show in warning
  const itineraryId = getQueryParam('id');
  try {
    // Fetch activities for this destination
    const resp = await fetch(`${API_BASE_URL}/activities/destination/${id}`);
    let activityCount = 0;
    if (resp.ok) {
      const activities = await resp.json();
      activityCount = activities.length;
    }
    
    // Build warning message
    let message = 'Delete this destination?';
    if (activityCount > 0) {
      message = `Delete this destination?\n\nWARNING: This will also delete ${activityCount} activity${activityCount !== 1 ? 'ies' : 'y'} associated with this destination.`;
    }
    
    if (!confirm(message)) return;
    
    const deleteResp = await fetch(`${API_BASE_URL}/destinations/${id}`, { method: 'DELETE' });
    if (!deleteResp.ok) throw new Error('Failed to delete destination');
    
    // Reload both destinations and activities since activities were deleted
    await loadDestinations(itineraryId);
    await loadActivitiesForItinerary(itineraryId);
  } catch (err) {
    alert(err.message);
  }
}

function openEditAccommodation(destinationId, accom) {
  // Similar to destination edit, create inline edit form
  const listContainer = document.querySelector(`.accommodation-list[data-destination-id="${destinationId}"]`);
  const item = Array.from(listContainer.children).find(el => 
    el.querySelector(`[data-id="${accom.Accommodation_ID}"]`)
  );
  if (!item) return;
  
  item.innerHTML = `
    <form class="inline-form edit-accommodation-form" data-id="${accom.Accommodation_ID}">
      <div class="form-row">
        <div class="form-field">
          <label>Name</label>
          <input type="text" class="edit-accom-name" value="${accom.Name || ''}" required>
        </div>
        <div class="form-field">
          <label>Cost</label>
          <input type="number" step="0.01" class="edit-accom-cost" value="${accom.Cost || ''}" placeholder="0.00">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Check In</label>
          <input type="date" class="edit-accom-checkin" value="${accom.Check_In ? accom.Check_In.split('T')[0] : ''}" min="${currentItinerary.Start_Date.split('T')[0]}" max="${currentItinerary.End_Date.split('T')[0]}">
        </div>
        <div class="form-field">
          <label>Check Out</label>
          <input type="date" class="edit-accom-checkout" value="${accom.Check_Out ? accom.Check_Out.split('T')[0] : ''}" min="${currentItinerary.Start_Date.split('T')[0]}" max="${currentItinerary.End_Date.split('T')[0]}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field" style="flex:1;">
          <label>Address</label>
          <input type="text" class="edit-accom-address" value="${accom.Address || ''}" placeholder="Enter address..." required>
        </div>
      </div>
      <div class="inline-error" style="display:none;"></div>
      <div class="inline-actions">
        <button type="button" class="secondary-btn cancel-edit-accom">Cancel</button>
        <button type="submit" class="primary-btn">Update Accommodation</button>
      </div>
    </form>
  `;
  
  const form = item.querySelector('form');
  const errorEl = form.querySelector('.inline-error');
  
  form.querySelector('.cancel-edit-accom').addEventListener('click', () => {
    loadAccommodations(destinationId);
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    
    const Name = form.querySelector('.edit-accom-name').value.trim();
    const Cost = form.querySelector('.edit-accom-cost').value.trim() || null;
    const Check_In = form.querySelector('.edit-accom-checkin').value || null;
    const Check_Out = form.querySelector('.edit-accom-checkout').value || null;
    const Address = form.querySelector('.edit-accom-address').value.trim();
    
    if (!Name) {
      errorEl.textContent = 'Name is required.';
      errorEl.style.display = 'block';
      return;
    }
    
    if (!Address) {
      errorEl.textContent = 'Address is required.';
      errorEl.style.display = 'block';
      return;
    }
    
    try {
      const resp = await fetch(`${API_BASE_URL}/accommodations/${accom.Accommodation_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name, Check_In, Check_Out, Cost, Address })
      });
      if (!resp.ok) throw new Error('Failed to update accommodation');
      await loadAccommodations(destinationId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
}

async function deleteAccommodation(destinationId, accomId) {
  if (!confirm('Delete this accommodation?')) return;
  try {
    const resp = await fetch(`${API_BASE_URL}/accommodations/${accomId}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete accommodation');
    await loadAccommodations(destinationId);
  } catch (err) {
    alert(err.message);
  }
}

function openEditActivity(destinationId, activity) {
  const listContainer = document.querySelector(`.activity-list[data-destination-id="${destinationId}"]`);
  const item = Array.from(listContainer.children).find(el => 
    el.getAttribute('data-activity-id') == activity.Activity_ID
  );
  if (!item) return;
  
  item.innerHTML = `
    <form class="inline-form edit-activity-form" data-id="${activity.Activity_ID}">
      <div class="form-row">
        <div class="form-field">
          <label>Name</label>
          <input type="text" class="edit-activity-name" value="${activity.Name || ''}" required>
        </div>
        <div class="form-field">
          <label>Category</label>
          <input type="text" class="edit-activity-category" value="${activity.Category || ''}" placeholder="e.g., Sightseeing">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Date (optional)</label>
          <input type="date" class="edit-activity-date" value="${activity.Date ? activity.Date.split('T')[0] : ''}">
        </div>
        <div class="form-field">
          <label>Cost</label>
          <input type="number" step="0.01" class="edit-activity-cost" value="${activity.Cost || ''}" placeholder="0.00">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field" style="flex:1;">
          <label>Address (optional)</label>
          <input type="text" class="edit-activity-address" value="${activity.Address || ''}" placeholder="Optional address...">
        </div>
      </div>
      <div class="inline-error" style="display:none;"></div>
      <div class="inline-actions">
        <button type="button" class="secondary-btn cancel-edit-activity">Cancel</button>
        <button type="submit" class="primary-btn">Update Activity</button>
      </div>
    </form>
  `;
  
  const form = item.querySelector('form');
  const errorEl = form.querySelector('.inline-error');
  
  form.querySelector('.cancel-edit-activity').addEventListener('click', () => {
    loadActivities(destinationId);
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    
    const Name = form.querySelector('.edit-activity-name').value.trim();
    const Category = form.querySelector('.edit-activity-category').value.trim() || null;
    const Date = form.querySelector('.edit-activity-date').value || null;
    const Cost = form.querySelector('.edit-activity-cost').value.trim() || null;
    const Address = form.querySelector('.edit-activity-address').value.trim() || null;
    
    if (!Name) {
      errorEl.textContent = 'Name is required.';
      errorEl.style.display = 'block';
      return;
    }
    
    try {
      const resp = await fetch(`${API_BASE_URL}/activities/${activity.Activity_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name, Date, Cost, Category, Address })
      });
      if (!resp.ok) throw new Error('Failed to update activity');
      await loadActivities(destinationId);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
}

async function deleteActivity(destinationId, activityId) {
  if (!confirm('Delete this activity?')) return;
  try {
    const resp = await fetch(`${API_BASE_URL}/activities/${activityId}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('Failed to delete activity');
    await loadActivities(destinationId);
  } catch (err) {
    alert(err.message);
  }
}

// ===== MAP FUNCTIONS =====

// Cache for geocoding results to avoid repeated API calls
const geocodeCache = {};

function initMap() {
  if (!map) {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
  }
}

async function geocodeLocation(query) {
  // Check cache first
  if (geocodeCache[query]) {
    return geocodeCache[query];
  }
  
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[query] = result;
      return result;
    }
    geocodeCache[query] = null;
    return null;
  } catch (err) {
    console.error(`Geocoding failed for "${query}":`, err);
    return null;
  }
}

async function updateMapMarkers(activities, destinations) {
  if (!map) return;
  
  // Clear existing markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  activityMarkerMap = {};
  destinationActivityMap = {};
  
  const bounds = [];
  
  // Collect unique addresses to geocode
  const addressesToGeocode = [];
  const activitiesWithAddresses = activities.filter(a => a.Address);
  
  for (const activity of activitiesWithAddresses) {
    if (!geocodeCache[activity.Address]) {
      addressesToGeocode.push(activity.Address);
    }
  }
  
  // Geocode unique addresses with rate limiting
  for (const address of addressesToGeocode) {
    await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 second delay for Nominatim
    await geocodeLocation(address);
  }
  
  // Add markers for activities with addresses
  for (const activity of activitiesWithAddresses) {
    const coords = geocodeCache[activity.Address];
    if (coords) {
      const marker = L.marker([coords.lat, coords.lng]).addTo(map);
      const popupContent = `
        <div style="font-family: 'Segoe UI', sans-serif;">
          <strong style="font-size: 1.1em;">${activity.Name}</strong><br>
          ${activity.Category ? `<span style="color: #666;">${activity.Category}</span><br>` : ''}
          ${activity.Date ? `<span style="color: #666;">${formatDate(activity.Date)}</span><br>` : ''}
          ${activity.Cost ? `<span style="color: #2ecc71; font-weight: 600;">$${parseFloat(activity.Cost).toFixed(2)}</span><br>` : ''}
          <span style="color: #999; font-size: 0.9em;">${activity.destinationName}</span>
        </div>
      `;
      marker.bindPopup(popupContent);
      markers.push(marker);
      bounds.push([coords.lat, coords.lng]);
      
      // Map activity ID to marker for click-to-highlight
      activityMarkerMap[activity.Activity_ID] = marker;
      
      // Build destination-to-activities mapping
      if (!destinationActivityMap[activity.Destination_ID]) {
        destinationActivityMap[activity.Destination_ID] = [];
      }
      destinationActivityMap[activity.Destination_ID].push(activity.Activity_ID);
    }
  }
  
  // Center map on markers if any exist
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  } else if (destinations.length > 0) {
    // No activity markers; try to center on first destination
    const dest = destinations[0];
    const destQuery = `${dest.City}, ${dest.Country}`;
    let coords = geocodeCache[destQuery];
    if (!coords) {
      await new Promise(resolve => setTimeout(resolve, 1100));
      coords = await geocodeLocation(destQuery);
    }
    if (coords) {
      map.setView([coords.lat, coords.lng], 10);
    }
  }
}

function showActivityOnMap(activityId) {
  const marker = activityMarkerMap[activityId];
  if (marker) {
    // Pan to marker and open popup
    map.setView(marker.getLatLng(), 15, { animate: true });
    marker.openPopup();
  }
}

function showDestinationOnMap(destinationId) {
  const activityIds = destinationActivityMap[destinationId];
  if (!activityIds || activityIds.length === 0) {
    // No activities with markers for this destination
    return;
  }
  
  // Collect all marker positions for this destination
  const bounds = [];
  activityIds.forEach(activityId => {
    const marker = activityMarkerMap[activityId];
    if (marker) {
      bounds.push(marker.getLatLng());
    }
  });
  
  if (bounds.length > 0) {
    // Fit map to show all activities in this destination
    map.fitBounds(bounds, { 
      padding: [50, 50],
      maxZoom: 13,
      animate: true
    });
  }
}

// ===== END MAP FUNCTIONS =====

// ===== BUDGET ANALYZER FUNCTIONS =====

async function initBudgetAnalyzer(itineraryId) {
  // Initialize budget widget click handler
  const budgetWidgetTrigger = document.getElementById('budget-widget-trigger');
  const budgetModalOverlay = document.getElementById('budget-modal-overlay');
  const closeBudgetModal = document.getElementById('close-budget-modal');
  const editBudgetBtn = document.getElementById('edit-budget-btn');
  const budgetEditForm = document.getElementById('budget-edit-form');
  const cancelBudgetEditBtn = document.getElementById('cancel-budget-edit');
  const saveBudgetBtn = document.getElementById('save-budget-btn');
  const newBudgetInput = document.getElementById('new-budget-input');

  if (budgetWidgetTrigger) {
    budgetWidgetTrigger.addEventListener('click', () => {
      budgetModalOverlay.style.display = 'flex';
      updateBudgetDisplay(itineraryId);
    });
  }

  if (closeBudgetModal) {
    closeBudgetModal.addEventListener('click', () => {
      budgetModalOverlay.style.display = 'none';
    });
  }

  // Close modal when clicking on overlay background
  if (budgetModalOverlay) {
    budgetModalOverlay.addEventListener('click', (e) => {
      if (e.target === budgetModalOverlay) {
        budgetModalOverlay.style.display = 'none';
      }
    });
  }

  // Category details modal close handler
  const categoryDetailsOverlay = document.getElementById('category-details-overlay');
  const closeCategoryDetailsBtn = document.getElementById('close-category-details');
  
  if (closeCategoryDetailsBtn) {
    closeCategoryDetailsBtn.addEventListener('click', () => {
      categoryDetailsOverlay.style.display = 'none';
    });
  }

  if (categoryDetailsOverlay) {
    categoryDetailsOverlay.addEventListener('click', (e) => {
      if (e.target === categoryDetailsOverlay) {
        categoryDetailsOverlay.style.display = 'none';
      }
    });
  }

  // Edit budget button handler
  if (editBudgetBtn) {
    editBudgetBtn.addEventListener('click', () => {
      newBudgetInput.value = currentItinerary.Budget || 0;
      budgetEditForm.style.display = 'block';
    });
  }

  // Cancel budget edit
  if (cancelBudgetEditBtn) {
    cancelBudgetEditBtn.addEventListener('click', () => {
      budgetEditForm.style.display = 'none';
      newBudgetInput.value = '';
    });
  }

  // Save budget changes
  if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener('click', async () => {
      const newBudget = parseFloat(newBudgetInput.value);
      if (isNaN(newBudget) || newBudget < 0) {
        alert('Please enter a valid budget amount');
        return;
      }
      try {
        const updateResp = await fetch(`${API_BASE_URL}/itineraries/${itineraryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Trip_Name: currentItinerary.Trip_Name,
            Start_Date: currentItinerary.Start_Date,
            End_Date: currentItinerary.End_Date,
            Budget: newBudget
          })
        });
        if (!updateResp.ok) throw new Error('Failed to update budget');
        currentItinerary.Budget = newBudget;
        budgetEditForm.style.display = 'none';
        updateBudgetDisplay(itineraryId);
      } catch (err) {
        alert('Error updating budget: ' + err.message);
      }
    });
  }

  // Initial budget display update
  updateBudgetDisplay(itineraryId);
}

async function updateBudgetDisplay(itineraryId) {
  try {
    // Fetch all expenses for this itinerary (actual expenses)
    const resp = await fetch(`${API_BASE_URL}/expenses/itinerary/${itineraryId}`);
    let expenses = [];
    if (resp.ok) {
      expenses = await resp.json() || [];
    }

    // Get destinations for this itinerary to filter activities
    const destinationsResp = await fetch(`${API_BASE_URL}/destinations/itinerary/${itineraryId}`);
    let destinations = [];
    if (destinationsResp.ok) {
      destinations = await destinationsResp.json() || [];
    }

    const destinationIds = new Set(destinations.map(d => d.Destination_ID));

    // Fetch all activities and filter by this itinerary's destinations
    const activitiesResp = await fetch(`${API_BASE_URL}/activities?user_id=${currentUser.User_ID}`);
    let allActivities = [];
    if (activitiesResp.ok) {
      allActivities = await activitiesResp.json() || [];
    }

    // Filter activities to only include those for this itinerary's destinations
    const activities = allActivities.filter(a => destinationIds.has(a.Destination_ID));

    // Fetch accommodations for this itinerary's destinations
    let accommodations = [];
    for (const destId of destinationIds) {
      try {
        const accomResp = await fetch(`${API_BASE_URL}/accommodations/destination/${destId}`);
        if (accomResp.ok) {
          const destAccommodations = await accomResp.json() || [];
          accommodations = accommodations.concat(destAccommodations);
        }
      } catch (err) {
        console.error(`Error fetching accommodations for destination ${destId}:`, err);
      }
    }

    // Calculate PLANNED expenses (Activity costs + Accommodation costs)
    let plannedExpenses = 0;
    let plannedByCategory = {};

    activities.forEach(activity => {
      const amount = parseFloat(activity.Cost) || 0;
      if (amount > 0) {
        plannedExpenses += amount;
        const category = activity.Category || 'Other';
        plannedByCategory[category] = (plannedByCategory[category] || 0) + amount;
      }
    });

    accommodations.forEach(accom => {
      const amount = parseFloat(accom.Cost) || 0;
      if (amount > 0) {
        plannedExpenses += amount;
        plannedByCategory['Accommodation'] = (plannedByCategory['Accommodation'] || 0) + amount;
      }
    });

    // Calculate ACTUAL expenses (from expenses table)
    let actualExpenses = 0;
    let actualByCategory = {};

    expenses.forEach(exp => {
      const amount = parseFloat(exp.Amount) || 0;
      actualExpenses += amount;
      // Extract category from the expense
      const category = exp.Category || 'Other';
      actualByCategory[category] = (actualByCategory[category] || 0) + amount;
    });
    
    console.log('Budget Display - Expenses:', expenses);
    console.log('Budget Display - Actual Expenses Total:', actualExpenses);

    // Get trip budget
    const tripBudget = currentItinerary && currentItinerary.Budget ? parseFloat(currentItinerary.Budget) : 0;
    const remaining = tripBudget - actualExpenses;

    // Update widget display
    document.getElementById('trip-budget-display').textContent = `$${tripBudget.toFixed(2)}`;
    document.getElementById('total-expenses-display').textContent = `$${plannedExpenses.toFixed(2)}`;
    
    const remainingDisplay = document.getElementById('budget-remaining-display');
    remainingDisplay.textContent = `$${remaining.toFixed(2)}`;
    
    // Change color based on budget status
    if (remaining < 0) {
      remainingDisplay.style.color = '#e74c3c'; // Red for over budget
    } else if (remaining < tripBudget * 0.1) {
      remainingDisplay.style.color = '#f39c12'; // Orange for low budget
    } else {
      remainingDisplay.style.color = '#27ae60'; // Green for healthy budget
    }

    // Update modal display
    const modalTripBudget = document.getElementById('modal-trip-budget');
    const modalPlannedExpenses = document.getElementById('modal-planned-expenses');
    const modalActualExpenses = document.getElementById('modal-actual-expenses');
    const modalTotalExpenses = document.getElementById('modal-total-expenses');
    const modalRemaining = document.getElementById('modal-remaining-budget');
    
    if (modalTripBudget) modalTripBudget.textContent = `$${tripBudget.toFixed(2)}`;
    if (modalPlannedExpenses) modalPlannedExpenses.textContent = `$${plannedExpenses.toFixed(2)}`;
    if (modalActualExpenses) modalActualExpenses.textContent = `$${actualExpenses.toFixed(2)}`;
    if (modalTotalExpenses) modalTotalExpenses.textContent = `$${plannedExpenses.toFixed(2)}`;
    if (modalRemaining) modalRemaining.textContent = `$${remaining.toFixed(2)}`;
    
    if (modalRemaining) {
      if (remaining < 0) {
        modalRemaining.style.color = '#e74c3c';
      } else if (remaining < tripBudget * 0.1) {
        modalRemaining.style.color = '#f39c12';
      } else {
        modalRemaining.style.color = '#27ae60';
      }
    }

    // Render expense breakdown - show both planned and actual
    renderExpenseBreakdown(plannedByCategory, actualByCategory, itineraryId);
  } catch (err) {
    console.error('Error updating budget display:', err);
  }
}

function renderExpenseBreakdown(plannedByCategory, actualByCategory, itineraryId) {
  const container = document.getElementById('expense-breakdown-container');
  
  // Get all unique categories from both planned and actual
  const allCategories = new Set([
    ...Object.keys(plannedByCategory || {}),
    ...Object.keys(actualByCategory || {})
  ]);
  
  if (allCategories.size === 0) {
    container.innerHTML = '<p>No expenses recorded yet.</p>';
    return;
  }

  // Sort categories by planned amount descending
  const sortedCategories = Array.from(allCategories)
    .sort((a, b) => (plannedByCategory[b] || 0) - (plannedByCategory[a] || 0));

  container.innerHTML = '';
  
  sortedCategories.forEach((category) => {
    const plannedAmount = plannedByCategory[category] || 0;
    const actualAmount = actualByCategory[category] || 0;
    
    const item = document.createElement('div');
    item.className = 'expense-category-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'expense-category-name';
    nameSpan.textContent = category;
    
    const amountsDiv = document.createElement('div');
    amountsDiv.style.display = 'flex';
    amountsDiv.style.gap = '2rem';
    amountsDiv.style.alignItems = 'center';
    
    const plannedSpan = document.createElement('span');
    plannedSpan.className = 'expense-category-amount';
    plannedSpan.style.textAlign = 'right';
    plannedSpan.style.minWidth = '80px';
    plannedSpan.title = 'Planned';
    plannedSpan.innerHTML = `<span style="font-size: 0.75rem; color: #999; display: block;">Plan:</span> $${plannedAmount.toFixed(2)}`;
    
    const actualSpan = document.createElement('span');
    actualSpan.className = 'expense-category-amount';
    actualSpan.style.textAlign = 'right';
    actualSpan.style.minWidth = '80px';
    actualSpan.title = 'Actual';
    actualSpan.innerHTML = `<span style="font-size: 0.75rem; color: #999; display: block;">Actual:</span> $${actualAmount.toFixed(2)}`;
    
    amountsDiv.appendChild(plannedSpan);
    amountsDiv.appendChild(actualSpan);
    
    item.appendChild(nameSpan);
    item.appendChild(amountsDiv);
    
    // Add click handler to show category details
    item.addEventListener('click', () => {
      showCategoryDetails(category, itineraryId);
    });
    
    container.appendChild(item);
  });
}

async function showCategoryDetails(category, itineraryId) {
  try {
    // Fetch expenses for this itinerary
    const expensesResp = await fetch(`${API_BASE_URL}/expenses/itinerary/${itineraryId}`);
    let expenses = [];
    if (expensesResp.ok) {
      expenses = await expensesResp.json() || [];
    }

    // Get destinations for this itinerary
    const destinationsResp = await fetch(`${API_BASE_URL}/destinations/itinerary/${itineraryId}`);
    let destinations = [];
    if (destinationsResp.ok) {
      destinations = await destinationsResp.json() || [];
    }

    const destinationIds = new Set(destinations.map(d => d.Destination_ID));

    // Fetch all activities
    const activitiesResp = await fetch(`${API_BASE_URL}/activities?user_id=${currentUser.User_ID}`);
    let allActivities = [];
    if (activitiesResp.ok) {
      allActivities = await activitiesResp.json() || [];
    }

    // Filter activities by this itinerary's destinations
    const activities = allActivities.filter(a => destinationIds.has(a.Destination_ID));

    // Fetch accommodations for this itinerary's destinations
    let accommodations = [];
    for (const destId of destinationIds) {
      try {
        const accomResp = await fetch(`${API_BASE_URL}/accommodations/destination/${destId}`);
        if (accomResp.ok) {
          const destAccommodations = await accomResp.json() || [];
          accommodations = accommodations.concat(destAccommodations);
        }
      } catch (err) {
        console.error(`Error fetching accommodations for destination ${destId}:`, err);
      }
    }

    // Collect all items in this category
    const categoryItems = [];
    let totalPlanned = 0;
    let totalActual = 0;

    // Add expenses from the Expense table (actual expenses)
    expenses.forEach(exp => {
      if (exp.Category === category) {
        const amount = parseFloat(exp.Amount) || 0;
        categoryItems.push({
          type: 'Actual Expense',
          name: exp.Notes ? exp.Notes.replace(/activity_\d+/, 'Activity Expense') : `Expense on ${exp.Date || 'N/A'}`,
          plannedAmount: 0,
          actualAmount: amount,
          date: exp.Date,
          category: exp.Category
        });
        totalActual += amount;
      }
    });

    // Add activities in this category
    activities.forEach(activity => {
      if (activity.Category === category) {
        const plannedAmount = parseFloat(activity.Cost) || 0;
        
        // Find if there's an actual expense for this activity
        let actualAmount = 0;
        const activityExpense = expenses.find(e => 
          e.Notes && e.Notes.includes(`activity_${activity.Activity_ID}`)
        );
        if (activityExpense) {
          actualAmount = parseFloat(activityExpense.Amount) || 0;
        }
        
        if (plannedAmount > 0 || actualAmount > 0) {
          categoryItems.push({
            type: 'Activity',
            name: activity.Name,
            plannedAmount: plannedAmount,
            actualAmount: actualAmount,
            date: activity.Date,
            category: activity.Category
          });
          totalPlanned += plannedAmount;
          totalActual += actualAmount;
        }
      }
    });

    // Add accommodations if category is 'Accommodation'
    if (category === 'Accommodation') {
      accommodations.forEach(accom => {
        const plannedAmount = parseFloat(accom.Cost) || 0;
        if (plannedAmount > 0) {
          categoryItems.push({
            type: 'Accommodation',
            name: accom.Name,
            plannedAmount: plannedAmount,
            actualAmount: 0,
            date: accom.Check_In,
            category: 'Accommodation'
          });
          totalPlanned += plannedAmount;
        }
      });
    }

    // Sort by date (newest first)
    categoryItems.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });

    // Update modal
    const categoryDetailsOverlay = document.getElementById('category-details-overlay');
    const categoryDetailsTitle = document.getElementById('category-details-title');
    const categoryTotal = document.getElementById('category-total');
    const itemsContainer = document.getElementById('category-items-container');

    categoryDetailsTitle.textContent = `${category} Details`;
    categoryTotal.innerHTML = `
      <div style="display: flex; gap: 2rem; align-items: center;">
        <div>
          <div style="font-size: 0.75rem; color: #999; margin-bottom: 0.25rem;">Planned:</div>
          <div style="font-size: 1.2rem; font-weight: 700;">$${totalPlanned.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: #999; margin-bottom: 0.25rem;">Actual:</div>
          <div style="font-size: 1.2rem; font-weight: 700;">$${totalActual.toFixed(2)}</div>
        </div>
      </div>
    `;

    // Render items
    if (categoryItems.length === 0) {
      itemsContainer.innerHTML = '<p>No items in this category.</p>';
    } else {
      itemsContainer.innerHTML = '';
      categoryItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'category-item';
        itemEl.innerHTML = `
          <div class="category-item-details">
            <div class="category-item-name">${item.name}</div>
            <div class="category-item-meta">
              <span class="category-item-type">${item.type}</span>
              ${item.date ? `<span>${formatDate(item.date)}</span>` : '<span>No date</span>'}
            </div>
          </div>
          <div class="category-item-costs" style="display: flex; gap: 1rem; text-align: right;">
            <div style="min-width: 80px;">
              <div style="font-size: 0.7rem; color: #999;">Plan</div>
              <div>$${item.plannedAmount.toFixed(2)}</div>
            </div>
            <div style="min-width: 80px;">
              <div style="font-size: 0.7rem; color: #999;">Actual</div>
              <div>$${item.actualAmount.toFixed(2)}</div>
            </div>
          </div>
        `;
        itemsContainer.appendChild(itemEl);
      });
    }

    // Show modal
    categoryDetailsOverlay.style.display = 'flex';
  } catch (err) {
    console.error('Error showing category details:', err);
    alert('Error loading category details');
  }
}

// ===== END BUDGET ANALYZER FUNCTIONS =====

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  // Collapsible sections: set initial state and handlers
  document.querySelectorAll('.collapse-toggle').forEach(btn => {
    const targetSelector = btn.getAttribute('data-target');
    const targetEl = document.querySelector(targetSelector);
    if (!targetEl) return;
    // Default expanded
    btn.setAttribute('aria-expanded', 'true');
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        btn.setAttribute('aria-expanded', 'false');
        targetEl.classList.add('collapsed');
      } else {
        btn.setAttribute('aria-expanded', 'true');
        targetEl.classList.remove('collapsed');
      }
    });
  });

  loadItinerary();
});
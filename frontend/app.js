const API_BASE_URL = 'http://localhost:3000/api';

// Check authentication on page load
let currentUser = null;

function checkAuth() {
    const userJson = sessionStorage.getItem('currentUser');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = JSON.parse(userJson);
    document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.Name}!`;
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Run auth check and then load itineraries
checkAuth();
document.addEventListener('DOMContentLoaded', () => {
    initItinerariesUI();
    loadItineraries();
});

async function loadItineraries() {
    const container = document.getElementById('itineraries-container');
    container.innerHTML = '<p>Loading itineraries...</p>';

    try {
        const url = `${API_BASE_URL}/itineraries?user_id=${currentUser.User_ID}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        renderItineraries(data);
    } catch (error) {
        container.innerHTML = `<p class="error">Error loading itineraries: ${error.message}</p>`;
        console.error('Fetch error:', error);
    }
}

function renderItineraries(data) {
    const container = document.getElementById('itineraries-container');

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>You haven't created any itineraries yet.</p>
                <button id="empty-create-btn" class="primary-btn">Create your first itinerary</button>
            </div>
        `;
        const emptyBtn = document.getElementById('empty-create-btn');
        emptyBtn.addEventListener('click', openItineraryModal);
        return;
    }

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headers = ['Trip_Name', 'Start_Date', 'End_Date', 'Actions'];
    const headerRow = document.createElement('tr');
    headers.forEach(key => {
        const th = document.createElement('th');
        th.textContent = formatHeader(key);
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    data.forEach(item => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
            // Avoid triggering when clicking action buttons
            if (e.target.classList.contains('action-btn')) return;
            window.location.href = `itinerary.html?id=${item.Itinerary_ID}`;
        });
        ['Trip_Name','Start_Date','End_Date'].forEach(key => {
            const td = document.createElement('td');
            if (key === 'Start_Date' || key === 'End_Date') {
                td.textContent = formatDate(item[key]);
            } else {
                td.textContent = item[key];
            }
            row.appendChild(td);
        });
        // Actions cell
        const actionTd = document.createElement('td');
        actionTd.className = 'action-cell';
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'action-btn edit-btn';
        editBtn.addEventListener('click', () => openEditModal(item));
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.addEventListener('click', () => deleteItinerary(item.Itinerary_ID));
        actionTd.appendChild(editBtn);
        actionTd.appendChild(deleteBtn);
        row.appendChild(actionTd);
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
}

function formatHeader(key) {
    // Convert camelCase or snake_case to Title Case
    return key
        .replace(/([A-Z])/g, ' $1') // camelCase
        .replace(/_/g, ' ') // snake_case
        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
}

// Modal / Create itinerary UI
function initItinerariesUI() {
    const createBtn = document.getElementById('create-itinerary-btn');
    const cancelBtn = document.getElementById('cancel-itinerary');
    const modal = document.getElementById('itinerary-modal');
    const form = document.getElementById('itinerary-form');

    createBtn.addEventListener('click', openItineraryModal);
    cancelBtn.addEventListener('click', () => closeItineraryModal());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeItineraryModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const Trip_Name = document.getElementById('trip-name').value.trim();
        const Start_Date = document.getElementById('start-date').value;
        const End_Date = document.getElementById('end-date').value;
        const itineraryId = document.getElementById('itinerary-id').value;

        if (!Trip_Name || !Start_Date || !End_Date) return;

        try {
            let method = 'POST';
            let url = `${API_BASE_URL}/itineraries`;
            if (itineraryId) {
                method = 'PUT';
                url = `${API_BASE_URL}/itineraries/${itineraryId}`;
            }
            const bodyData = itineraryId ? {
                Trip_Name,
                Start_Date,
                End_Date
            } : {
                User_ID: currentUser.User_ID,
                Trip_Name,
                Start_Date,
                End_Date
            };
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            if (!resp.ok) throw new Error(itineraryId ? 'Failed to update itinerary' : 'Failed to create itinerary');
            closeItineraryModal();
            await loadItineraries();
        } catch (err) {
            alert(err.message);
        }
    });
}

function openItineraryModal() {
    const modal = document.getElementById('itinerary-modal');
    document.getElementById('itinerary-modal-title').textContent = 'Create New Itinerary';
    document.getElementById('save-itinerary-btn').textContent = 'Save Itinerary';
    document.getElementById('itinerary-id').value = '';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

function closeItineraryModal() {
    const modal = document.getElementById('itinerary-modal');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.getElementById('itinerary-form').reset();
}

function openEditModal(itinerary) {
    const modal = document.getElementById('itinerary-modal');
    document.getElementById('itinerary-modal-title').textContent = 'Edit Itinerary';
    document.getElementById('save-itinerary-btn').textContent = 'Update Itinerary';
    document.getElementById('itinerary-id').value = itinerary.Itinerary_ID;
    document.getElementById('trip-name').value = itinerary.Trip_Name;
    document.getElementById('start-date').value = itinerary.Start_Date?.substring(0,10);
    document.getElementById('end-date').value = itinerary.End_Date?.substring(0,10);
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
}

async function deleteItinerary(id) {
    if (!confirm('Delete this itinerary? This cannot be undone.')) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/itineraries/${id}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error('Failed to delete itinerary');
        await loadItineraries();
    } catch (err) {
        alert(err.message);
    }
}

function formatDate(raw) {
    if (!raw) return '';
    // Ensure we only use the date portion
    const dateObj = new Date(raw);
    if (isNaN(dateObj.getTime())) return raw; // fallback if invalid
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString(undefined, options); // uses user's locale
}

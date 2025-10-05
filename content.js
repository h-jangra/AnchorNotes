let counter = 1;
let activeLabel = null;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let labels = {};
let currentPageUrl = window.location.href;

// Load saved data on initialization
loadFromStorage();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addNumberLabel") {
    console.log('Received message to add label at:', request.x, request.y);
    createNumberLabel(request.x, request.y);
    sendResponse({ success: true });
  }
  return true;
});

async function loadFromStorage() {
  try {
    const result = await chrome.storage.local.get(['numberLabelsData']);
    if (result.numberLabelsData) {
      const pageData = result.numberLabelsData[currentPageUrl];
      if (pageData) {
        counter = pageData.counter || 1;
        labels = pageData.labels || {};

        // Restore labels on page
        Object.keys(labels).forEach(id => {
          const labelData = labels[id];
          restoreLabel(id, labelData);
        });
      }
    }
  } catch (error) {
    console.error('Error loading from storage:', error);
  }
}

async function saveToStorage() {
  try {
    const result = await chrome.storage.local.get(['numberLabelsData']);
    const allData = result.numberLabelsData || {};

    allData[currentPageUrl] = {
      counter: counter,
      labels: labels
    };

    await chrome.storage.local.set({ numberLabelsData: allData });
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

function restoreLabel(id, data) {
  const label = document.createElement('div');
  label.className = 'draggable-number-label';
  label.textContent = data.number;
  label.style.left = `${data.x}px`;
  label.style.top = `${data.y}px`;
  label.dataset.labelId = id;

  if (data.note) {
    label.classList.add('has-note');
  }

  label.addEventListener('click', handleLabelClick);
  label.addEventListener('mousedown', startDrag);

  document.body.appendChild(label);
}

function createNumberLabel(x, y) {
  console.log('Creating label at:', x, y);
  const labelId = `label-${Date.now()}-${Math.random()}`;
  const numberText = String(counter).padStart(2, '0');

  // Adjust position to account for scroll
  const adjustedX = (x || 100) + window.scrollX;
  const adjustedY = (y || 100) + window.scrollY;

  console.log('Adjusted position:', adjustedX, adjustedY);

  // Create label element
  const label = document.createElement('div');
  label.className = 'draggable-number-label';
  label.textContent = numberText;
  label.style.left = `${adjustedX}px`;
  label.style.top = `${adjustedY}px`;
  label.dataset.labelId = labelId;

  // Store label data
  labels[labelId] = {
    number: numberText,
    x: adjustedX,
    y: adjustedY,
    note: ''
  };

  // Add event listeners
  label.addEventListener('click', handleLabelClick);
  label.addEventListener('mousedown', startDrag);

  document.body.appendChild(label);
  console.log('Label added to DOM');
  counter++;
  saveToStorage();
}

function handleLabelClick(e) {
  if (isDragging) {
    isDragging = false;
    return;
  }

  e.stopPropagation();
  const labelId = e.target.dataset.labelId;
  showNotePopup(labelId, e.target);
}

function renumberLabels() {
  // Get all labels and sort by their current number
  const allLabels = Array.from(document.querySelectorAll('.draggable-number-label'));
  const labelArray = allLabels.map(el => ({
    element: el,
    id: el.dataset.labelId,
    data: labels[el.dataset.labelId]
  })).sort((a, b) => {
    const numA = parseInt(a.data.number);
    const numB = parseInt(b.data.number);
    return numA - numB;
  });

  // Renumber all labels
  labelArray.forEach((item, index) => {
    const newNumber = String(index + 1).padStart(2, '0');
    item.element.textContent = newNumber;
    labels[item.id].number = newNumber;
  });

  // Update counter to next number
  counter = labelArray.length + 1;
  saveToStorage();
}

function showNotePopup(labelId, labelElement) {
  // Remove existing popup if any
  const existing = document.querySelector('.note-popup-overlay');
  if (existing) existing.remove();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'note-popup-overlay';

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'note-popup';

  const labelData = labels[labelId];

  popup.innerHTML = `
    <div class="note-popup-header">
      <div class="note-popup-title">Note for ${labelData.number}</div>
      <button class="note-popup-close">×</button>
    </div>
    <textarea class="note-popup-textarea" placeholder="Add your notes here...">${labelData.note || ''}</textarea>
    <div class="note-popup-buttons">
      <button class="note-popup-button save">Save</button>
      <button class="note-popup-button delete">Delete Label</button>
    </div>
  `;

  // Position popup near the label
  const rect = labelElement.getBoundingClientRect();
  popup.style.left = `${rect.left + window.scrollX}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 10}px`;

  // Adjust if popup goes off screen
  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  const popupRect = popup.getBoundingClientRect();
  if (popupRect.right > window.innerWidth) {
    popup.style.left = `${window.innerWidth - popupRect.width - 20}px`;
  }
  if (popupRect.bottom > window.innerHeight) {
    popup.style.top = `${rect.top + window.scrollY - popupRect.height - 10}px`;
  }

  // Event listeners
  const textarea = popup.querySelector('.note-popup-textarea');
  const saveBtn = popup.querySelector('.save');
  const deleteBtn = popup.querySelector('.delete');
  const closeBtn = popup.querySelector('.note-popup-close');

  function closePopup() {
    overlay.remove();
    popup.remove();
  }

  saveBtn.addEventListener('click', () => {
    labels[labelId].note = textarea.value;
    if (textarea.value) {
      labelElement.classList.add('has-note');
    } else {
      labelElement.classList.remove('has-note');
    }
    saveToStorage();
    closePopup();
  });

  deleteBtn.addEventListener('click', () => {
    delete labels[labelId];
    labelElement.remove();
    renumberLabels(); // Renumber after deletion
    closePopup();
  });

  closeBtn.addEventListener('click', closePopup);
  overlay.addEventListener('click', closePopup);

  // Focus textarea
  textarea.focus();
}

function startDrag(e) {
  if (e.target.classList.contains('note-popup-close') ||
    e.target.classList.contains('note-popup-button')) {
    return;
  }

  activeLabel = e.target;
  isDragging = false;

  // Calculate offset from mouse to element position
  const rect = activeLabel.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  // Prevent text selection while dragging
  e.preventDefault();
  e.stopPropagation();

  // Add event listeners
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);

  // Change cursor
  activeLabel.style.cursor = 'grabbing';
}

function drag(e) {
  if (!activeLabel) return;

  isDragging = true;

  // Calculate new position
  const newX = e.pageX - offsetX;
  const newY = e.pageY - offsetY;

  activeLabel.style.left = `${newX}px`;
  activeLabel.style.top = `${newY}px`;

  // Update stored position
  const labelId = activeLabel.dataset.labelId;
  if (labels[labelId]) {
    labels[labelId].x = newX;
    labels[labelId].y = newY;
  }
}

function stopDrag() {
  if (activeLabel) {
    activeLabel.style.cursor = 'grab';
    activeLabel = null;
    saveToStorage();
  }

  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);

  // Reset isDragging after a short delay
  setTimeout(() => {
    isDragging = false;
  }, 100);
}

// Keyboard shortcut to reset counter (Ctrl+Shift+R)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    renumberLabels();
    console.log('Labels renumbered');
  }

  // Clear all labels (Ctrl+Shift+C)
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    if (confirm('Clear all labels?')) {
      document.querySelectorAll('.draggable-number-label').forEach(el => el.remove());
      labels = {};
      counter = 1;
      saveToStorage();
      console.log('All labels cleared');
    }
  }
});

console.log('Number Labels Extension content script loaded');

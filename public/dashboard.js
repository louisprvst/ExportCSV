const csvOutput = document.getElementById('csv-output');
const statusMessage = document.getElementById('status-message');

function getCsvEditorValue() {
  const editor = csvOutput.querySelector('.csv-editor');
  if (!editor) return '';
  return editor.value || '';
}

function autoResizeCsvEditor(editor) {
  if (!editor) return;
  editor.style.height = 'auto';
  editor.style.height = `${editor.scrollHeight}px`;
}

// Choix du mode (laps, temps ou distance)
const timeInput = document.getElementById('time-input');
const distanceInput = document.getElementById('distance-input');
const lapTypeToggle = document.getElementById('lap-type-toggle');
const includeLapTypesInput = document.getElementById('includeLapTypes');

function updateModeInputs(mode) {
  if (mode === 'time') {
    timeInput.style.display = 'block';
    distanceInput.style.display = 'none';
    lapTypeToggle.style.display = 'none';
  } else if (mode === 'distance') {
    timeInput.style.display = 'none';
    distanceInput.style.display = 'block';
    lapTypeToggle.style.display = 'none';
  } else {
    timeInput.style.display = 'none';
    distanceInput.style.display = 'none';
    lapTypeToggle.style.display = 'block';
  }
}

document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    updateModeInputs(radio.value);
  });
});

const currentMode = document.querySelector('input[name="mode"]:checked')?.value || 'laps';
updateModeInputs(currentMode);

// Récupération des activités 
async function fetchActivities() {
  statusMessage.textContent = 'Chargement des activités...';

  try {
    const res = await fetch('/api/activities');
    if (!res.ok) {
      const errorText = await res.text();

      if (res.status === 401) {
        window.location.href = '/';
        return;
      }

      throw new Error(errorText || `Erreur API activités (${res.status})`);
    }

    const activities = await res.json();

    const list = document.getElementById('activities-list');
    list.innerHTML = '';

    if (activities.length === 0) {
      statusMessage.textContent = 'Aucune activité trouvée.';
      return;
    }

    statusMessage.textContent = '';

    activities.forEach(act => {
      const li = document.createElement('li');

      const infoDiv = document.createElement('div');
      infoDiv.classList.add('activity-info');

      const nameEl = document.createElement('strong');
      nameEl.textContent = act.name;

      const distanceEl = document.createElement('span');
      distanceEl.textContent = `${act.distance} km`;

      const dateEl = document.createElement('span');
      dateEl.textContent = new Date(act.start_date).toLocaleDateString();

      infoDiv.appendChild(nameEl);
      infoDiv.appendChild(distanceEl);
      infoDiv.appendChild(dateEl);

      const btn = document.createElement('button');
      btn.textContent = 'Exporter CSV';
      btn.onclick = () => loadCSV(act.id);

      li.appendChild(infoDiv);
      li.appendChild(btn);
      list.appendChild(li);
    });

  } 
  catch (err) {
    console.error(err);
    statusMessage.textContent = err?.message || 'Impossible de charger les activités.';
  }
}

// Chargement du CSV
async function loadCSV(id) {
  try {
    csvOutput.textContent = 'Chargement...';

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const timeStep = document.getElementById('timeStep').value;
    const distanceStep = document.getElementById('distanceStep').value;
    const includeLapTypes = includeLapTypesInput.checked;

    const res = await fetch(
      `/export/${id}?mode=${mode}&timeStep=${timeStep}&distanceStep=${distanceStep}&includeLapTypes=${includeLapTypes}`
    );

    if (!res.ok) {
      throw new Error('Erreur export CSV');
    }

    const csv = await res.text();

    csvOutput.innerHTML = '';

    const actions = document.createElement('div');
    actions.classList.add('csv-actions');

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copier';
    copyBtn.addEventListener('click', copyCSV);

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Télécharger';
    downloadBtn.addEventListener('click', downloadCSV);

    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);

    const editor = document.createElement('textarea');
    editor.classList.add('csv-block', 'csv-editor');
    editor.value = csv;
    editor.spellcheck = false;
    editor.addEventListener('input', () => autoResizeCsvEditor(editor));

    csvOutput.appendChild(actions);
    csvOutput.appendChild(editor);

    autoResizeCsvEditor(editor);

    // Auto scroll vers le résultat
    csvOutput.scrollIntoView({ behavior: 'smooth' });

  } 
  catch (err) {
    console.error(err);
    csvOutput.textContent = 'Erreur chargement CSV';
  }
}

// Pour le bouton copier
function copyCSV() {
  const csv = getCsvEditorValue();
  navigator.clipboard.writeText(csv);
}

// Pour le bouton télécharger
function downloadCSV() {
  const csv = getCsvEditorValue();

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'activity.csv';
  a.click();

  URL.revokeObjectURL(url);
}

// Initialisation    
fetchActivities();
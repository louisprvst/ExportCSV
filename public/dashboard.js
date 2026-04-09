const csvOutput = document.getElementById('csv-output');

// Choix du mode (laps, temps ou distance)
const timeInput = document.getElementById('time-input');
const distanceInput = document.getElementById('distance-input');

document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'time') {
      timeInput.style.display = 'block';
      distanceInput.style.display = 'none';
    } else if (radio.value === 'distance') {
      timeInput.style.display = 'none';
      distanceInput.style.display = 'block';
    } else if (radio.value === 'laps') {
      timeInput.style.display = 'none';
      distanceInput.style.display = 'none';
    }
  });
});

// Récupération des activités 
async function fetchActivities() {
  try {
    const res = await fetch('/api/activities');
    if (!res.ok) {
      throw new Error('Erreur API activités');
    }

    const activities = await res.json();

    const list = document.getElementById('activities-list');
    list.innerHTML = '';

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
  }
}

// Chargement du CSV
async function loadCSV(id) {
  try {
    csvOutput.textContent = 'Chargement...';

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const timeStep = document.getElementById('timeStep').value;
    const distanceStep = document.getElementById('distanceStep').value;

    const res = await fetch(
      `/export/${id}?mode=${mode}&timeStep=${timeStep}&distanceStep=${distanceStep}`
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

    const pre = document.createElement('pre');
    pre.classList.add('csv-block');
    pre.textContent = csv;

    csvOutput.appendChild(actions);
    csvOutput.appendChild(pre);

    csvOutput.dataset.csv = csv;

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
  const csv = csvOutput.dataset.csv;
  navigator.clipboard.writeText(csv);
}

// Pour le bouton télécharger
function downloadCSV() {
  const csv = csvOutput.dataset.csv;

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
const csvOutput = document.getElementById('csv-output');

// Choix du mode (temps ou distance)
const timeInput = document.getElementById('time-input');
const distanceInput = document.getElementById('distance-input');

document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'time') {
      timeInput.style.display = 'block';
      distanceInput.style.display = 'none';
    } else {
      timeInput.style.display = 'none';
      distanceInput.style.display = 'block';
    }
  });
});

// Récupération des activités 
async function fetchActivities() {
  try {
    const res = await fetch('/api/activities');
    const activities = await res.json();

    const list = document.getElementById('activities-list');
    list.innerHTML = '';

    activities.forEach(act => {
      const li = document.createElement('li');

      const infoDiv = document.createElement('div');
      infoDiv.classList.add('activity-info');
      infoDiv.innerHTML = `
        <strong>${act.name}</strong>
        <span>${act.distance} km</span>
        <span>${new Date(act.start_date).toLocaleDateString()}</span>
      `;

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
    csvOutput.innerHTML = 'Chargement...';

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const timeStep = document.getElementById('timeStep').value;
    const distanceStep = document.getElementById('distanceStep').value;

    const res = await fetch(
      `/export/${id}?mode=${mode}&timeStep=${timeStep}&distanceStep=${distanceStep}`
    );

    const csv = await res.text();

    csvOutput.innerHTML = `
      <div class="csv-actions">
        <button onclick="copyCSV()">Copier</button>
        <button onclick="downloadCSV()">Télécharger</button>
      </div>
      <pre class="csv-block">${csv}</pre>
    `;

    csvOutput.dataset.csv = csv;

    // Auto scroll vers le résultat
    csvOutput.scrollIntoView({ behavior: 'smooth' });

  } 
  catch (err) {
    console.error(err);
    csvOutput.innerHTML = 'Erreur chargement CSV';
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
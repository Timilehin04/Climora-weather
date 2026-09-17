/* =========================================================
   Climora — app.js
   Fetches real-time weather from the free Open-Meteo API
   (no API key required) and renders it into the DOM.
   ========================================================= */

// ---------- DOM references ----------
const searchForm     = document.getElementById('searchForm');
const cityInput      = document.getElementById('cityInput');
const searchBtn      = document.getElementById('searchBtn');
const statusMessage  = document.getElementById('statusMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const weatherCard    = document.getElementById('weatherCard');
const unitToggle     = document.getElementById('unitToggle');

const weatherIcon    = document.getElementById('weatherIcon');
const tempValue      = document.getElementById('tempValue');
const tempUnit       = document.getElementById('tempUnit');
const conditionText  = document.getElementById('conditionText');
const locationText   = document.getElementById('locationText');
const updatedText    = document.getElementById('updatedText');
const feelsLike       = document.getElementById('feelsLike');
const humidity         = document.getElementById('humidity');
const wind              = document.getElementById('wind');
const windDir           = document.getElementById('windDir');

// ---------- API endpoints ----------
const GEOCODE_URL  = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// ---------- App state ----------
// Keeps the last fetched reading in Celsius so the unit toggle
// can re-render instantly without another network request.
let lastReading = null; // { tempC, feelsLikeC, humidity, windKmh, windDeg, code, place }
let currentUnit = 'C';

// ---------- Weather code → label / icon category ----------
// Mapping follows the WMO weather codes returned by Open-Meteo.
function describeWeatherCode(code) {
  const table = {
    0:  { label: 'Clear sky',            category: 'clear' },
    1:  { label: 'Mostly clear',         category: 'clear' },
    2:  { label: 'Partly cloudy',        category: 'cloud' },
    3:  { label: 'Overcast',             category: 'cloud' },
    45: { label: 'Fog',                  category: 'fog' },
    48: { label: 'Depositing rime fog',  category: 'fog' },
    51: { label: 'Light drizzle',        category: 'rain' },
    53: { label: 'Drizzle',              category: 'rain' },
    55: { label: 'Dense drizzle',        category: 'rain' },
    56: { label: 'Freezing drizzle',     category: 'rain' },
    57: { label: 'Freezing drizzle',     category: 'rain' },
    61: { label: 'Light rain',           category: 'rain' },
    63: { label: 'Rain',                 category: 'rain' },
    65: { label: 'Heavy rain',           category: 'rain' },
    66: { label: 'Freezing rain',        category: 'rain' },
    67: { label: 'Freezing rain',        category: 'rain' },
    71: { label: 'Light snow',           category: 'snow' },
    73: { label: 'Snow',                 category: 'snow' },
    75: { label: 'Heavy snow',           category: 'snow' },
    77: { label: 'Snow grains',          category: 'snow' },
    80: { label: 'Rain showers',         category: 'rain' },
    81: { label: 'Rain showers',         category: 'rain' },
    82: { label: 'Violent showers',      category: 'rain' },
    85: { label: 'Snow showers',         category: 'snow' },
    86: { label: 'Snow showers',         category: 'snow' },
    95: { label: 'Thunderstorm',         category: 'storm' },
    96: { label: 'Thunderstorm, hail',   category: 'storm' },
    99: { label: 'Thunderstorm, hail',   category: 'storm' },
  };
  return table[code] || { label: 'Unknown conditions', category: 'cloud' };
}

// ---------- Compass direction from degrees ----------
function degToCompass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return dirs[index];
}

// ---------- Icon set (inline SVG, single colour via currentColor) ----------
function iconMarkup(category) {
  const icons = {
    clear: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" style="color:#C98A3B">
      <circle cx="24" cy="24" r="9"/>
      <g stroke-linecap="round">
        <line x1="24" y1="4" x2="24" y2="10"/>
        <line x1="24" y1="38" x2="24" y2="44"/>
        <line x1="4" y1="24" x2="10" y2="24"/>
        <line x1="38" y1="24" x2="44" y2="24"/>
        <line x1="9.5" y1="9.5" x2="13.5" y2="13.5"/>
        <line x1="34.5" y1="34.5" x2="38.5" y2="38.5"/>
        <line x1="9.5" y1="38.5" x2="13.5" y2="34.5"/>
        <line x1="34.5" y1="13.5" x2="38.5" y2="9.5"/>
      </g>
    </svg>`,
    cloud: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" style="color:#6E96A8">
      <path d="M14 32a8 8 0 0 1-1-15.9A10 10 0 0 1 32 13a7 7 0 0 1 1 13.9" stroke-linejoin="round"/>
      <path d="M13 32h21" stroke-linecap="round"/>
    </svg>`,
    fog: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" style="color:#6E96A8" stroke-linecap="round">
      <line x1="8" y1="18" x2="40" y2="18"/>
      <line x1="12" y1="24" x2="36" y2="24"/>
      <line x1="8" y1="30" x2="40" y2="30"/>
    </svg>`,
    rain: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" style="color:#6E96A8">
      <path d="M14 27a8 8 0 0 1-1-15.9A10 10 0 0 1 32 8a7 7 0 0 1 1 13.9" stroke-linejoin="round"/>
      <g stroke-linecap="round">
        <line x1="16" y1="32" x2="14" y2="40"/>
        <line x1="24" y1="32" x2="22" y2="40"/>
        <line x1="32" y1="32" x2="30" y2="40"/>
      </g>
    </svg>`,
    snow: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" style="color:#EDE7DA">
      <path d="M14 27a8 8 0 0 1-1-15.9A10 10 0 0 1 32 8a7 7 0 0 1 1 13.9" stroke-linejoin="round"/>
      <g stroke-linecap="round">
        <line x1="16" y1="33" x2="16" y2="41"/>
        <line x1="12.5" y1="35" x2="19.5" y2="39"/>
        <line x1="19.5" y1="35" x2="12.5" y2="39"/>
        <line x1="32" y1="33" x2="32" y2="41"/>
        <line x1="28.5" y1="35" x2="35.5" y2="39"/>
        <line x1="35.5" y1="35" x2="28.5" y2="39"/>
      </g>
    </svg>`,
    storm: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" style="color:#A8452F">
      <path d="M14 25a8 8 0 0 1-1-15.9A10 10 0 0 1 32 6a7 7 0 0 1 1 13.9" stroke-linejoin="round"/>
      <path d="M25 26l-6 10h6l-4 8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  };
  return icons[category] || icons.cloud;
}

// ---------- UI state helpers ----------
function setLoading(isLoading) {
  loadingSpinner.hidden = !isLoading;
  searchBtn.disabled = isLoading;
}

function setStatus(message, tone = 'error') {
  statusMessage.textContent = message || '';
  statusMessage.classList.toggle('is-info', tone === 'info');
}

function hideCard() {
  weatherCard.hidden = true;
  weatherCard.classList.remove('is-visible');
}

// ---------- Rendering ----------
function renderReading() {
  if (!lastReading) return;

  const { tempC, feelsLikeC, humidity: rh, windKmh, windDeg, code, place } = lastReading;
  const { label, category } = describeWeatherCode(code);

  const isF = currentUnit === 'F';
  const toDisplayTemp = (celsius) =>
    isF ? Math.round(celsius * 9 / 5 + 32) : Math.round(celsius);

  tempValue.textContent = toDisplayTemp(tempC);
  tempUnit.textContent = isF ? '°F' : '°C';
  feelsLike.textContent = `${toDisplayTemp(feelsLikeC)}°`;

  conditionText.textContent = label;
  locationText.textContent = place;
  updatedText.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  humidity.textContent = `${Math.round(rh)}%`;
  wind.textContent = `${Math.round(windKmh)} km/h`;
  windDir.textContent = degToCompass(windDeg);

  weatherIcon.innerHTML = iconMarkup(category);

  weatherCard.hidden = false;
  // restart the fade-in animation on every new reading
  weatherCard.classList.remove('is-visible');
  void weatherCard.offsetWidth; // force reflow so the animation replays
  weatherCard.classList.add('is-visible');
}

// ---------- Networking ----------
async function geocodeCity(name) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('network');
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('not-found');
  }

  const result = data.results[0];
  const placeParts = [result.name, result.admin1, result.country].filter(Boolean);

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    place: [...new Set(placeParts)].join(', '),
  };
}

async function fetchCurrentWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m',
    timezone: 'auto',
  });

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('network');
  }

  const data = await response.json();

  if (!data.current) {
    throw new Error('network');
  }

  return data.current;
}

// ---------- Search handler ----------
async function handleSearch(event) {
  event.preventDefault();

  const city = cityInput.value.trim();
  setStatus('');

  if (!city) {
    setStatus('Enter a city to search.');
    cityInput.focus();
    return;
  }

  hideCard();
  setLoading(true);

  try {
    const { latitude, longitude, place } = await geocodeCity(city);
    const current = await fetchCurrentWeather(latitude, longitude);

    lastReading = {
      tempC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windKmh: current.wind_speed_10m,
      windDeg: current.wind_direction_10m,
      code: current.weather_code,
      place,
    };

    renderReading();
  } catch (err) {
    if (err.message === 'not-found') {
      setStatus(`We couldn't find "${city}". Try a different spelling.`);
    } else {
      setStatus('Something went wrong. Check your connection and try again.');
    }
  } finally {
    setLoading(false);
  }
}

// ---------- Unit toggle handler ----------
function handleUnitToggle(event) {
  const button = event.target.closest('.unit-btn');
  if (!button) return;

  const nextUnit = button.dataset.unit;
  if (nextUnit === currentUnit) return;

  currentUnit = nextUnit;

  unitToggle.querySelectorAll('.unit-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.unit === currentUnit);
  });

  if (lastReading) {
    renderReading();
  }
}

// ---------- Wire up events ----------
searchForm.addEventListener('submit', handleSearch);
unitToggle.addEventListener('click', handleUnitToggle);

// Friendly starting state
setStatus('Search a city to see current conditions.', 'info');
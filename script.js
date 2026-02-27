/* =====================================================
   CONFIG
===================================================== */
const API_KEY = "Add Your Api Key Here"; 
const ICON_PATH = "assets/weather/";

/* =====================================================
   DOM ELEMENTS
===================================================== */
const appBody = document.querySelector(".app-body");
const cityInput = document.querySelector(".city-input");
const searchBtn = document.querySelector(".search-btn");

const emptyPanel = document.querySelector(".empty-panel");
const emptyImg = document.querySelector(".empty-content img");
const emptyTitle = document.querySelector(".empty-content h2");
const emptyMsg = document.querySelector(".empty-content p");

const searchedLocationEl = document.querySelector(".searched-location");
const searchedCityNameEl = document.querySelector(".searched-city-name");

const currentWeatherEl = document.querySelector(".current-weather");
const cityNameEl = document.querySelector(".city-name");
const dateEl = document.querySelector(".date");
const tempEl = document.querySelector(".temperature");
const descEl = document.querySelector(".weather-desc");
const weatherIconEl = document.querySelector(".weather-icon");

const detailsGridEl = document.querySelector(".details-grid");
const feelsLikeEl = document.querySelector(".detail-card:nth-child(1) h3");
const humidityEl = document.querySelector(".detail-card:nth-child(2) h3");
const windEl = document.querySelector(".detail-card:nth-child(3) h3");
const pressureEl = document.querySelector(".detail-card:nth-child(4) h3");

const hourlySectionEl = document.querySelector(".hourly");
const dailySectionEl = document.querySelector(".daily");
const hourlyListEl = document.querySelector(".hourly-list");
const dailyScrollEl = document.querySelector(".daily-scroll");

const sunCard = document.querySelector(".sun-card");
const sunriseEl = document.querySelector(".sunrise-time");
const sunsetEl = document.querySelector(".sunset-time");
const sunIndicator = document.querySelector(".sun-indicator");

/* =====================================================
   EVENTS
===================================================== */
searchBtn.addEventListener("click", handleSearch);
cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") handleSearch();
});

/* =====================================================
   UI STATE HELPERS
===================================================== */
function showEmptyState(img, title, msg) {
  appBody.classList.add("empty-mode");
  appBody.classList.remove("app-mode");
  emptyPanel.style.display = "flex";
  searchedLocationEl.classList.add("hidden");
  emptyImg.src = img;
  emptyTitle.textContent = title;
  emptyMsg.textContent = msg;
  hideWeatherSections();
}

function showAppState() {
  appBody.classList.remove("empty-mode");
  appBody.classList.add("app-mode");
  emptyPanel.style.display = "none";
  currentWeatherEl.style.display = "flex";
  detailsGridEl.style.display = "grid";
  hourlySectionEl.style.display = "flex";
  dailySectionEl.style.display = "flex";
  sunCard.style.display = "flex";
}

function hideWeatherSections() {
  currentWeatherEl.style.display = "none";
  detailsGridEl.style.display = "none";
  hourlySectionEl.style.display = "none";
  dailySectionEl.style.display = "none";
  sunCard.style.display = "none";
}

/* =====================================================
   SEARCH HANDLER
===================================================== */
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return;

  searchedLocationEl.classList.remove("hidden");
  searchedCityNameEl.textContent = city;

  showEmptyState(
    "assets/weather/loading.svg",
    "Fetching Weather",
    "Please wait while we get the latest data"
  );

  try {
    const [current, forecast] = await Promise.all([
      getCurrentWeather(city),
      getForecast(city)
    ]);

    showAppState();
    updateCurrentWeather(current);
    updateHourlyForecast(forecast, current.timezone);
    updateDailyForecast(forecast, current.timezone);

    searchedCityNameEl.textContent = current.name;
    cityInput.value = "";
  } catch (error) {
    console.error(error);
    showEmptyState(
      "assets/weather/not-found.png",
      "City Not Found",
      "Try searching for another city"
    );
  }
}

/* =====================================================
   API CALLS
===================================================== */
async function getCurrentWeather(city) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("City not found");
  return res.json();
}

async function getForecast(city) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`
  );
  if (!res.ok) throw new Error("Forecast error");
  return res.json();
}

/* =====================================================
   TIME HELPERS (UTC BASED)
===================================================== */
function formatCityTime(unix, offset) {
  const date = new Date((unix + offset) * 1000);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  });
}

function formatCityDate(unix, offset) {
  const date = new Date((unix + offset) * 1000);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  });
}

/* =====================================================
   CURRENT WEATHER
===================================================== */
function updateCurrentWeather(data) {
  const offset = data.timezone;
  
  // Update city name with your SVG icon
  cityNameEl.innerHTML = `
    <img src="assets/weather/location.svg" class="loc-icon" alt="location">
    ${data.name}
  `;

  dateEl.textContent = formatCityDate(data.dt, offset);
  tempEl.textContent = `${Math.round(data.main.temp)}°`;
  descEl.textContent = data.weather[0].description;

  feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;
  pressureEl.textContent = `${data.main.pressure} hPa`;
  windEl.textContent = `${data.wind.speed} m/s • ${getWindDirection(data.wind.deg)}`;

  // Night detection for icon
  const night = data.dt >= data.sys.sunset || data.dt <= data.sys.sunrise;
  weatherIconEl.src = getLocalIcon(data.weather[0], night);

  sunriseEl.textContent = formatCityTime(data.sys.sunrise, offset);
  sunsetEl.textContent = formatCityTime(data.sys.sunset, offset);

  const progress = Math.min(
    Math.max((data.dt - data.sys.sunrise) / (data.sys.sunset - data.sys.sunrise), 0),
    1
  );
  sunIndicator.style.left = `${progress * 100}%`;
}

/* =====================================================
   HOURLY FORECAST
===================================================== */
function updateHourlyForecast(forecast, offset) {
  hourlyListEl.innerHTML = "";
  const now = forecast.list[0].dt;

  forecast.list
    .filter(item => item.dt > now)
    .slice(0, 12)
    .forEach(item => {
      const localDate = new Date((item.dt + offset) * 1000);
      const hour = localDate.getUTCHours();
      const night = hour < 6 || hour >= 18;

      hourlyListEl.insertAdjacentHTML("beforeend", `
        <div class="hour-card">
          <span>${formatCityTime(item.dt, offset)}</span>
          <img src="${getLocalIcon(item.weather[0], night)}" alt="">
          <strong>${Math.round(item.main.temp)}°</strong>
        </div>
      `);
    });
}

/* =====================================================
   DAILY FORECAST
===================================================== */
function updateDailyForecast(forecast, offset) {
  dailyScrollEl.innerHTML = "";
  const days = {};

  forecast.list.forEach(item => {
    const localDate = new Date((item.dt + offset) * 1000);
    const key = localDate.toISOString().split("T")[0];
    
    if (!days[key]) days[key] = { temps: [], weather: {}, dateObj: localDate };

    days[key].temps.push(item.main.temp);
    const type = item.weather[0].main;
    days[key].weather[type] = (days[key].weather[type] || 0) + 1;
  });

  Object.keys(days).slice(0, 6).forEach((key, i) => {
    const day = days[key];
    const mainWeather = Object.entries(day.weather).sort((a, b) => b[1] - a[1])[0][0];
    
    // Label logic: Today, Tomorrow, or Weekday Name
    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : day.dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

    dailyScrollEl.insertAdjacentHTML("beforeend", `
      <div class="day-card">
        <span class="day-name">${dayName}</span>
        <img src="${getLocalIcon({ main: mainWeather })}" alt="">
        <div class="day-temp">
          <span>${Math.round(Math.max(...day.temps))}°</span>
          <span>${Math.round(Math.min(...day.temps))}°</span>
        </div>
      </div>
    `);
  });
}

/* =====================================================
   ICONS
===================================================== */
function getLocalIcon(weather, night = false) {
  const m = weather.main.toLowerCase();
  if (m === "clear") return ICON_PATH + (night ? "clear-night.svg" : "clear-sky-day.svg");
  if (m === "clouds") return ICON_PATH + "clouds.svg";
  if (m === "rain" || m === "drizzle") return ICON_PATH + "rain.svg";
  if (m === "thunderstorm") return ICON_PATH + "thunderstorm.svg";
  if (m === "snow") return ICON_PATH + "snow.svg";
  if (["fog", "mist", "haze"].includes(m)) return ICON_PATH + "fog.svg";
  return ICON_PATH + "default.svg";
}

/* =====================================================
   HELPERS
===================================================== */
const getWindDirection = d =>
  ["N","NE","E","SE","S","SW","W","NW"][Math.round(d / 45) % 8];

/* =====================================================
   INIT
===================================================== */
window.addEventListener("load", () => {
  showEmptyState(
    "assets/weather/default.png",
    "Search City",
    "Find out the weather condition of the city"
  );
});
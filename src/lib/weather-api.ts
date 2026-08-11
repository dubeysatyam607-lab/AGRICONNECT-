// src/lib/weather-api.ts

/**
 * Simple wrapper around OpenWeatherMap (or similar) to fetch current weather data.
 * Uses the environment variable WEATHER_API_KEY which should be defined in .env.example.
 * Returns the raw JSON response from the API for flexibility.
 */

import axios from 'axios';

const API_KEY = process.env.WEATHER_API_KEY;
if (!API_KEY) {
  throw new Error('WEATHER_API_KEY is not defined in the environment');
}

/**
 * Fetch current weather for given latitude and longitude.
 * @param lat Latitude (e.g., 28.6139)
 * @param lon Longitude (e.g., 77.2090)
 * @returns Weather data JSON object.
 */
export const fetchWeather = async (lat: number, lon: number) => {
  const url = 'https://api.openweathermap.org/data/2.5/weather';
  const response = await axios.get(url, {
    params: {
      lat,
      lon,
      appid: API_KEY,
      units: 'metric',
    },
  });
  return response.data;
};

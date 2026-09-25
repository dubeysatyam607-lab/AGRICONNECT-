/*
 * AgriConnect ESP32 IoT Node Firmware (Production Hardware Build)
 *
 * Micro-controller: ESP32 Dev Module
 * Protocol: HTTPS POST
 * Endpoint: https://<your-agriconnect-domain>/api/iot/telemetry
 * Interval: 30 Seconds
 *
 * Hardware Pinout Configuration:
 *   - Soil Moisture Analog Probe: GPIO 34 (ADC1_CH6)
 *   - Rain Sensor Analog Probe:   GPIO 35 (ADC1_CH7)
 *   - DHT11 Temp/Humidity Sensor: GPIO 4
 *
 * Wi-Fi Requirement: 2.4 GHz network (ESP32 does NOT support 5 GHz Wi-Fi)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ── 1. NETWORK & DEVICE IDENTITY CONFIGURATION ───────────────────────────
const char* WIFI_SSID     = "Satyam";
const char* WIFI_PASSWORD = "9109035656";

// Target AgriConnect Telemetry Endpoint (Change to your live server IP or domain)
// Example for local testing on same network: "http://192.168.x.x:5000/api/iot/telemetry"
const char* SERVER_URL    = "http://192.168.1.100:5000/api/iot/telemetry";

// Device Unique Identifier & Secret Hardware Authentication Token
const char* DEVICE_UID    = "AGRI-ESP32-001";
const char* DEVICE_TOKEN  = "agri_secret_token_12345";

// Telemetry transmit interval (every 30 seconds)
const unsigned long TELEMETRY_INTERVAL_MS = 30000;

// ── 2. SENSOR PINS ───────────────────────────────────────────────────────
#define SOIL_PIN 34
#define RAIN_PIN 35
#define DHTPIN 4
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
unsigned long lastTelemetryTime = 0;

// ── 3. SETUP ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=============================================");
  Serial.println("   AgriConnect ESP32 Hardware Node Starting");
  Serial.println("   Device UID: AGRI-ESP32-001");
  Serial.println("=============================================");

  // Initialize sensors
  dht.begin();
  pinMode(SOIL_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);

  // ── FIX FOR "wifi:sta is connecting, cannot set config" ERROR ──
  // Clear any stuck state or background auto-connect attempt
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(200);

  Serial.print("Connecting to 2.4GHz Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected Successfully!");
    Serial.print("ESP32 Local IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWi-Fi initial connect timeout. Will keep retrying automatically in main loop.");
  }
}

// ── 4. MAIN LOOP ─────────────────────────────────────────────────────────
void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS || lastTelemetryTime == 0) {
    lastTelemetryTime = currentMillis;

    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry();
    } else {
      Serial.println("Wi-Fi link lost. Attempting reconnection to 'Satyam'...");
      WiFi.disconnect(true);
      delay(100);
      WiFi.mode(WIFI_STA);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }

  delay(100);
}

// ── 5. TELEMETRY TRANSMISSION (HTTP / HTTPS POST) ────────────────────────
void sendTelemetry() {
  // Read raw analog sensor values
  int soilRaw = analogRead(SOIL_PIN);
  int rainRaw = analogRead(RAIN_PIN);
  float temp = dht.readTemperature();
  float humid = dht.readHumidity();

  // Print readings to Serial Monitor
  Serial.println("\n--- Real Sensor Telemetry ---");
  Serial.print("Soil Moisture (Raw ADC GPIO34): "); Serial.println(soilRaw);
  Serial.print("Rain Sensor (Raw ADC GPIO35):   "); Serial.println(rainRaw);
  Serial.print("Temperature (°C GPIO4):         "); Serial.println(isnan(temp) ? 0.0 : temp);
  Serial.print("Humidity (% GPIO4):             "); Serial.println(isnan(humid) ? 0.0 : humid);

  // Construct JSON Payload
  StaticJsonDocument<256> doc;
  doc["deviceUid"]    = DEVICE_UID;
  doc["soilMoisture"] = soilRaw;
  doc["temperature"]  = isnan(temp) ? 0.0 : temp;
  doc["humidity"]     = isnan(humid) ? 0.0 : humid;
  doc["rainValue"]    = rainRaw;
  doc["fenceStatus"]  = "NOT_CONNECTED";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("Posting Payload to /api/iot/telemetry:");
  Serial.println(jsonPayload);

  // Support both HTTP and HTTPS based on SERVER_URL
  HTTPClient http;
  if (String(SERVER_URL).startsWith("https")) {
    WiFiClientSecure client;
    client.setInsecure(); // Skip SSL cert validation during dev testing
    if (http.begin(client, SERVER_URL)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Token", DEVICE_TOKEN);
      http.setTimeout(10000);
      int httpResponseCode = http.POST(jsonPayload);
      Serial.print("HTTP Response Code: "); Serial.println(httpResponseCode);
      if (httpResponseCode > 0) {
        Serial.print("Server Response: "); Serial.println(http.getString());
      }
      http.end();
    }
  } else {
    WiFiClient client;
    if (http.begin(client, SERVER_URL)) {
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Token", DEVICE_TOKEN);
      http.setTimeout(10000);
      int httpResponseCode = http.POST(jsonPayload);
      Serial.print("HTTP Response Code: "); Serial.println(httpResponseCode);
      if (httpResponseCode > 0) {
        Serial.print("Server Response: "); Serial.println(http.getString());
      }
      http.end();
    }
  }
}

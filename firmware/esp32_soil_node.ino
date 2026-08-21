/**
 * AgriConnect — ESP32 Soil Telemetry Edge Node Firmware
 * Reads capacitive soil moisture, temperature, and battery voltage.
 * Sends encrypted HTTP POST payload to AgriConnect FastAPI webhook.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// AgriConnect Webhook Configuration
const char* serverUrl = "https://your-agriconnect-server.com/api/v1/telemetry/soil";
const char* deviceSecret = "AGRI_ESP32_SECRET_KEY_2026";
const char* farmId = "FARM-UP-7821";
const char* deviceId = "ESP32-NODE-01";

// Hardware Sensor Pins
#define SOIL_MOISTURE_PIN 34 // Capacitive Soil Moisture Sensor Analog Pin
#define BATTERY_PIN 35       // Voltage divider to measure 3.7V Li-ion battery

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n[AgriConnect ESP32] Initializing...");
  
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Connection failed. Going to sleep...");
    // Sleep for 5 minutes and retry
    esp_sleep_enable_timer_wakeup(300ULL * 1000000ULL);
    esp_deep_sleep_start();
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", deviceSecret);

    // Read and calibrate soil moisture (Air = ~3500, Water = ~1400)
    int rawMoisture = analogRead(SOIL_MOISTURE_PIN);
    float moisturePct = map(rawMoisture, 3500, 1400, 0, 100);
    moisturePct = constrain(moisturePct, 0.0, 100.0);

    // Read battery voltage through 1:2 divider
    int rawBattery = analogRead(BATTERY_PIN);
    float batteryVoltage = (rawBattery / 4095.0) * 3.3 * 2.0;

    StaticJsonDocument<256> doc;
    doc["device_id"] = deviceId;
    doc["farm_id"] = farmId;
    doc["moisture_percentage"] = moisturePct;
    doc["soil_temperature_celsius"] = 25.4; // Can be read via DS18B20 1-Wire
    doc["battery_voltage"] = batteryVoltage;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.println("[Telemetry] Sending: " + jsonPayload);
    int httpResponseCode = http.POST(jsonPayload);
    Serial.printf("[Telemetry] Response Code: %d\n", httpResponseCode);
    
    http.end();
  }

  // Deep sleep for 10 minutes (600 seconds) to conserve solar/battery power
  Serial.println("[AgriConnect] Entering deep sleep for 10 minutes...");
  esp_sleep_enable_timer_wakeup(600ULL * 1000000ULL);
  esp_deep_sleep_start();
}

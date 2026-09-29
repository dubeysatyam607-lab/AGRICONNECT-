/*
 * AgriConnect ESP32 Production IoT Farm Node Firmware
 * ===================================================
 *
 * Hardware Supported:
 * - ESP32 Dev Module
 * - Soil Moisture Sensor (Analog ADC)
 * - DHT11 / DHT22 Temperature & Humidity Sensor
 * - Rain Sensor Board (Analog ADC)
 * - 0.96" OLED Display (SSD1306 / SH1106 I2C 128x64) - Optional/Modular
 * - Relay Modules (Water pump, Buzzer, Laser Fence)
 *
 * Requirements Met:
 * - Genuine physical telemetry only (No fake / simulated data)
 * - Automatic Wi-Fi reconnection (Non-blocking millis task loop)
 * - Automatic backend device registration & ONLINE status matching DEVICE_UID
 * - Modular sensor failure handling (null payload when sensor disconnected)
 * - Calibrated 0-100% soil moisture conversion
 * - Calibrated rain status categorization (NO_RAIN, LIGHT_RAIN, RAIN, HEAVY_RAIN)
 * - Full command lifecycle polling and HTTP ACK (PUMP_ON/OFF, BUZZER_ON/OFF, ARM/DISARM_FENCE)
 * - Does NOT require Arduino IDE after initial flash
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#include "config.h"

// ── Default Fallbacks for Config Macros ───────────────────────────────────────
#ifndef TELEMETRY_INTERVAL_MS
#define TELEMETRY_INTERVAL_MS 30000UL
#endif
#ifndef COMMAND_POLL_INTERVAL_MS
#define COMMAND_POLL_INTERVAL_MS 15000UL
#endif
#ifndef SENSOR_READ_INTERVAL_MS
#define SENSOR_READ_INTERVAL_MS 2000UL
#endif
#ifndef DISPLAY_UPDATE_INTERVAL_MS
#define DISPLAY_UPDATE_INTERVAL_MS 1000UL
#endif
#ifndef WIFI_RECONNECT_INTERVAL_MS
#define WIFI_RECONNECT_INTERVAL_MS 10000UL
#endif

#ifndef RELAY_ACTIVE_LOW
#define RELAY_ACTIVE_LOW true
#endif

// ── Hardware Modules Setup ───────────────────────────────────────────────────
DHT dht(PIN_DHT, DHTTYPE);

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
bool hasDisplay = false;

// ── Relay Control State Helpers ──────────────────────────────────────────────
inline void setRelayState(int pin, bool turnOn) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, turnOn ? LOW : HIGH);
  } else {
    digitalWrite(pin, turnOn ? HIGH : LOW);
  }
}

// ── Physical Telemetry State Structure ───────────────────────────────────────
struct SensorData {
  int rawSoil = -1;
  int soilPercent = -1;
  bool soilValid = false;

  int rawRain = -1;
  String rainStatus = "NOT_CONNECTED";
  bool rainValid = false;

  float temperature = NAN;
  bool tempValid = false;

  float humidity = NAN;
  bool humValid = false;

  String fenceStatus = "NOT_CONNECTED";
} currentSensors;

// ── Non-Blocking Millis Task Timers ──────────────────────────────────────────
unsigned long lastSensorReadTime = 0;
unsigned long lastDisplayUpdateTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastCommandPollTime = 0;
unsigned long lastWifiCheckTime = 0;

// ── Wi-Fi Connection States ──────────────────────────────────────────────────
enum WifiStatusState {
  STATE_DISCONNECTED,
  STATE_CONNECTING,
  STATE_CONNECTED,
  STATE_RECONNECTING
};

WifiStatusState currentWifiState = STATE_DISCONNECTED;

// ── Forward Declarations ─────────────────────────────────────────────────────
void checkWifiConnection();
void readSensors();
void updateDisplay();
void sendTelemetryPayload();
void pollAndExecuteCommands();
void acknowledgeCommand(const String& commandId, const String& status, const String& errorMsg);

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("   AGRICONNECT ESP32 LIVE IoT HARDWARE NODE      ");
  Serial.println("==================================================");
  Serial.print("Device UID: "); Serial.println(DEVICE_UID);
  Serial.print("Server API: "); Serial.println(AGRI_SERVER_BASE);
  Serial.println("--------------------------------------------------");

  // 1. Initialize GPIO Pin Modes & Safe Startup States
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_FENCE_LASER, OUTPUT);
  pinMode(PIN_FENCE_LDR, INPUT);

  // Safe boot output states: ALL OFF at startup
  setRelayState(PIN_PUMP_RELAY, false);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_FENCE_LASER, LOW);

  // 2. Configure ESP32 ADC Resolution & Attenuation
  analogReadResolution(12); // 12-bit ADC (0 - 4095)
  analogSetPinAttenuation(PIN_SOIL, ADC_11db);
  analogSetPinAttenuation(PIN_RAIN, ADC_11db);

  // 3. Initialize DHT Sensor
  dht.begin();
  Serial.println("[Hardware] DHT Sensor Initialized");

  // 4. Modular Display Detection (Does NOT hang if disconnected)
#if ENABLE_OLED_DISPLAY
  Wire.begin(OLED_SDA, OLED_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    hasDisplay = true;
    Serial.println("[Hardware] OLED Display initialized (0x3C)");
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 8);
    display.println("AgriConnect");
    display.setTextSize(2);
    display.setCursor(12, 26);
    display.println("FARM NODE");
    display.setTextSize(1);
    display.setCursor(15, 50);
    display.println(DEVICE_UID);
    display.display();
  } else {
    hasDisplay = false;
    Serial.println("[Hardware] OLED Display NOT found! Continuing without display.");
  }
#else
  hasDisplay = false;
  Serial.println("[Hardware] Display disabled in config.h");
#endif

  // 5. Connect Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  checkWifiConnection();

  Serial.println("[Setup] Hardware Node initialization complete.");
  Serial.println("==================================================");
}

// =============================================================================
// MAIN LOOP (Non-blocking Millis Task Scheduler)
// =============================================================================
void loop() {
  unsigned long now = millis();

  // Task 1: Wi-Fi Reconnection Manager
  if (now - lastWifiCheckTime >= WIFI_RECONNECT_INTERVAL_MS || lastWifiCheckTime == 0) {
    lastWifiCheckTime = now;
    checkWifiConnection();
  }

  // Task 2: Physical Sensor Sampling
  if (now - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS || lastSensorReadTime == 0) {
    lastSensorReadTime = now;
    readSensors();
  }

  // Task 3: Display Refresh
  if (now - lastDisplayUpdateTime >= DISPLAY_UPDATE_INTERVAL_MS || lastDisplayUpdateTime == 0) {
    lastDisplayUpdateTime = now;
    updateDisplay();
  }

  // Task 4: Real Telemetry HTTP POST
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS || lastTelemetryTime == 0) {
    lastTelemetryTime = now;
    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetryPayload();
    }
  }

  // Task 5: Command Polling GET & ACK
  if (now - lastCommandPollTime >= COMMAND_POLL_INTERVAL_MS || lastCommandPollTime == 0) {
    lastCommandPollTime = now;
    if (WiFi.status() == WL_CONNECTED) {
      pollAndExecuteCommands();
    }
  }
}

// =============================================================================
// WI-FI MANAGEMENT (Non-blocking)
// =============================================================================
void checkWifiConnection() {
  wl_status_t status = WiFi.status();

  if (status == WL_CONNECTED) {
    if (currentWifiState != STATE_CONNECTED) {
      currentWifiState = STATE_CONNECTED;
      Serial.println();
      Serial.println("[Wi-Fi] State: CONNECTED");
      Serial.print("[Wi-Fi] IP Address: ");
      Serial.println(WiFi.localIP());
      Serial.print("[Wi-Fi] Signal RSSI: ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
    }
    return;
  }

  if (currentWifiState == STATE_DISCONNECTED || currentWifiState == STATE_CONNECTED) {
    currentWifiState = STATE_CONNECTING;
    Serial.println("[Wi-Fi] State: CONNECTING to 2.4 GHz network (" + String(WIFI_SSID) + ")");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  } else if (currentWifiState == STATE_CONNECTING) {
    currentWifiState = STATE_RECONNECTING;
    Serial.println("[Wi-Fi] State: RECONNECTING...");
    WiFi.reconnect();
  }
}

// =============================================================================
// READ PHYSICAL SENSORS (Strict Validation - Zero Fake Data)
// =============================================================================
void readSensors() {
  // ── 1. Soil Moisture ───────────────────────────────────────────────────────
  int rawSoil = analogRead(PIN_SOIL);
  // ESP32 12-bit ADC range: 0 - 4095. A value of 0 or > 4090 usually indicates disconnected pin
  if (rawSoil > 50 && rawSoil < 4050) {
    currentSensors.rawSoil = rawSoil;
    // Map raw ADC to calibrated 0-100% moisture level
    int mapped = map(rawSoil, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
    currentSensors.soilPercent = constrain(mapped, 0, 100);
    currentSensors.soilValid = true;
  } else {
    currentSensors.soilValid = false;
    currentSensors.soilPercent = -1;
  }

  // ── 2. Rain Sensor ─────────────────────────────────────────────────────────
  int rawRain = analogRead(PIN_RAIN);
  if (rawRain > 50 && rawRain < 4050) {
    currentSensors.rawRain = rawRain;
    currentSensors.rainValid = true;

    if (rawRain >= RAIN_DRY_VALUE) {
      currentSensors.rainStatus = "NO_RAIN";
    } else if (rawRain >= RAIN_LIGHT_VALUE) {
      currentSensors.rainStatus = "LIGHT_RAIN";
    } else if (rawRain >= RAIN_HEAVY_VALUE) {
      currentSensors.rainStatus = "RAIN";
    } else {
      currentSensors.rainStatus = "HEAVY_RAIN";
    }
  } else {
    currentSensors.rainValid = false;
    currentSensors.rainStatus = "NOT_CONNECTED";
  }

  // ── 3. DHT11 / DHT22 Sensor ────────────────────────────────────────────────
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t) && t >= -40.0 && t <= 85.0) {
    currentSensors.temperature = t;
    currentSensors.tempValid = true;
  } else {
    currentSensors.temperature = NAN;
    currentSensors.tempValid = false;
  }

  if (!isnan(h) && h >= 0.0 && h <= 100.0) {
    currentSensors.humidity = h;
    currentSensors.humValid = true;
  } else {
    currentSensors.humidity = NAN;
    currentSensors.humValid = false;
  }

  // ── 4. Laser Fence Status Check ───────────────────────────────────────────
  int ldrVal = digitalRead(PIN_FENCE_LDR);
  if (ldrVal == HIGH) {
    currentSensors.fenceStatus = "NORMAL";
  } else {
    currentSensors.fenceStatus = "NOT_CONNECTED";
  }
}

// =============================================================================
// PHYSICAL DISPLAY REFRESH
// =============================================================================
void updateDisplay() {
  if (!hasDisplay) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Header line
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("AgriConnect Node");
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // Wi-Fi Status Bar
  display.setCursor(0, 12);
  if (WiFi.status() == WL_CONNECTED) {
    display.print("WiFi: OK");
  } else {
    display.print("WiFi: Offline");
  }

  display.setCursor(68, 12);
  display.print(DEVICE_UID);

  // Soil Moisture Display
  display.setCursor(0, 24);
  display.print("Soil: ");
  if (currentSensors.soilValid) {
    display.print(currentSensors.soilPercent);
    display.print("%");
  } else {
    display.print("N/A");
  }

  // Temperature Display
  display.setCursor(0, 36);
  display.print("Temp: ");
  if (currentSensors.tempValid) {
    display.print(currentSensors.temperature, 1);
    display.print(" C");
  } else {
    display.print("N/A");
  }

  // Humidity Display
  display.setCursor(0, 48);
  display.print("Hum:  ");
  if (currentSensors.humValid) {
    display.print(currentSensors.humidity, 0);
    display.print("%");
  } else {
    display.print("N/A");
  }

  // Rain Display
  display.setCursor(68, 48);
  if (currentSensors.rainValid) {
    display.print(currentSensors.rainStatus.substring(0, 6));
  } else {
    display.print("Rain N/A");
  }

  display.display();
}

// =============================================================================
// TELEMETRY TRANSMISSION (HTTP POST)
// =============================================================================
void sendTelemetryPayload() {
  String url = String(AGRI_SERVER_BASE) + "/telemetry";

  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (url.startsWith("https")) {
    secureClient.setInsecure(); // Skip certificate verification for standard HTTPS serverless
    http.begin(secureClient, url);
  } else {
    http.begin(plainClient, url);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  // Construct JSON String Payload (Real physical numbers or null)
  String json = "{";
  json += "\"deviceUid\":\"" + String(DEVICE_UID) + "\",";
  json += "\"deviceToken\":\"" + String(DEVICE_TOKEN) + "\",";

  if (currentSensors.soilValid) {
    json += "\"soilMoisture\":" + String(currentSensors.soilPercent) + ",";
  } else {
    json += "\"soilMoisture\":null,";
  }

  if (currentSensors.tempValid) {
    json += "\"temperature\":" + String(currentSensors.temperature, 1) + ",";
  } else {
    json += "\"temperature\":null,";
  }

  if (currentSensors.humValid) {
    json += "\"humidity\":" + String(currentSensors.humidity, 1) + ",";
  } else {
    json += "\"humidity\":null,";
  }

  if (currentSensors.rainValid) {
    json += "\"rainValue\":" + String(currentSensors.rawRain) + ",";
    json += "\"rainStatus\":\"" + currentSensors.rainStatus + "\",";
  } else {
    json += "\"rainValue\":null,";
    json += "\"rainStatus\":\"NOT_CONNECTED\",";
  }

  json += "\"fenceStatus\":\"" + currentSensors.fenceStatus + "\",";
  json += "\"deviceStatus\":\"ONLINE\"";
  json += "}";

  Serial.println("\n[Telemetry] Sending HTTP POST to " + url);
  Serial.println("[Telemetry] Payload: " + json);

  int httpCode = http.POST(json);

  if (httpCode > 0) {
    Serial.print("[Telemetry] HTTP Response Code: ");
    Serial.println(httpCode);
    String response = http.getString();
    Serial.print("[Telemetry] Response: ");
    Serial.println(response);
  } else {
    Serial.print("[Telemetry] HTTP POST Failed. Error: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }

  http.end();
}

// =============================================================================
// COMMAND POLLING & HARDWARE EXECUTION
// =============================================================================
void pollAndExecuteCommands() {
  String url = String(AGRI_SERVER_BASE) + "/commands?deviceUid=" + String(DEVICE_UID);

  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (url.startsWith("https")) {
    secureClient.setInsecure();
    http.begin(secureClient, url);
  } else {
    http.begin(plainClient, url);
  }

  http.addHeader("x-device-token", DEVICE_TOKEN);

  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("[Command Poll] Response: " + payload);

    // Simple robust JSON extractor for command items: {"id":"...","command":"..."}
    int cmdIdx = payload.indexOf("\"command\":\"");
    while (cmdIdx != -1) {
      int cmdStart = cmdIdx + 11;
      int cmdEnd = payload.indexOf("\"", cmdStart);
      String commandName = payload.substring(cmdStart, cmdEnd);

      // Extract command ID
      int idIdx = payload.lastIndexOf("\"id\":\"", cmdIdx);
      String commandId = "";
      if (idIdx != -1) {
        int idStart = idIdx + 6;
        int idEnd = payload.indexOf("\"", idStart);
        commandId = payload.substring(idStart, idEnd);
      }

      Serial.print("[Command] Received Executable Command: ");
      Serial.print(commandName);
      Serial.print(" (ID: ");
      Serial.print(commandId);
      Serial.println(")");

      // ── Hardware Execution ────────────────────────────────────────────────
      bool success = true;
      String errMessage = "";

      if (commandName == "PUMP_ON") {
        setRelayState(PIN_PUMP_RELAY, true);
        Serial.println("[Hardware] PUMP RELAY TURNED ON");
      } else if (commandName == "PUMP_OFF") {
        setRelayState(PIN_PUMP_RELAY, false);
        Serial.println("[Hardware] PUMP RELAY TURNED OFF");
      } else if (commandName == "BUZZER_ON") {
        digitalWrite(PIN_BUZZER, HIGH);
        Serial.println("[Hardware] BUZZER TURNED ON");
      } else if (commandName == "BUZZER_OFF") {
        digitalWrite(PIN_BUZZER, LOW);
        Serial.println("[Hardware] BUZZER TURNED OFF");
      } else if (commandName == "ARM_FENCE") {
        digitalWrite(PIN_FENCE_LASER, HIGH);
        Serial.println("[Hardware] LASER FENCE ARMED");
      } else if (commandName == "DISARM_FENCE") {
        digitalWrite(PIN_FENCE_LASER, LOW);
        Serial.println("[Hardware] LASER FENCE DISARMED");
      } else {
        success = false;
        errMessage = "Unsupported hardware command: " + commandName;
        Serial.println("[Hardware] " + errMessage);
      }

      // Acknowledge back to server
      if (commandId.length() > 0) {
        acknowledgeCommand(commandId, success ? "EXECUTED" : "FAILED", errMessage);
      }

      cmdIdx = payload.indexOf("\"command\":\"", cmdEnd);
    }
  } else if (httpCode > 0) {
    Serial.print("[Command Poll] HTTP Code: ");
    Serial.println(httpCode);
  }

  http.end();
}

// =============================================================================
// COMMAND ACKNOWLEDGMENT (HTTP POST)
// =============================================================================
void acknowledgeCommand(const String& commandId, const String& status, const String& errorMsg) {
  String url = String(AGRI_SERVER_BASE) + "/command-ack";

  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (url.startsWith("https")) {
    secureClient.setInsecure();
    http.begin(secureClient, url);
  } else {
    http.begin(plainClient, url);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  String json = "{";
  json += "\"deviceUid\":\"" + String(DEVICE_UID) + "\",";
  json += "\"deviceToken\":\"" + String(DEVICE_TOKEN) + "\",";
  json += "\"commandId\":\"" + commandId + "\",";
  json += "\"status\":\"" + status + "\"";
  if (errorMsg.length() > 0) {
    json += ",\"error\":\"" + errorMsg + "\"";
  }
  json += "}";

  Serial.println("[Command ACK] Posting ACK: " + json);
  int httpCode = http.POST(json);

  if (httpCode > 0) {
    Serial.print("[Command ACK] Response Code: ");
    Serial.println(httpCode);
  } else {
    Serial.print("[Command ACK] Failed: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }

  http.end();
}
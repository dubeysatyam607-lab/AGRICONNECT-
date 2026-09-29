/*
 * AgriConnect ESP32 Production IoT Farm Node Firmware
 * ===================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#include "config.h"

// ── Hardware Setup ───────────────────────────────────────────────────────────
DHT dht(PIN_DHT, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
bool hasDisplay = false;

inline void setRelayState(int pin, bool turnOn) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, turnOn ? LOW : HIGH);
  } else {
    digitalWrite(pin, turnOn ? HIGH : LOW);
  }
}

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

unsigned long lastSensorReadTime = 0;
unsigned long lastDisplayUpdateTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastCommandPollTime = 0;
unsigned long lastWifiCheckTime = 0;

enum WifiStatusState { STATE_DISCONNECTED, STATE_CONNECTING, STATE_CONNECTED, STATE_RECONNECTING };
WifiStatusState currentWifiState = STATE_DISCONNECTED;

void checkWifiConnection();
void readSensors();
void updateDisplay();
void sendTelemetryPayload();
void pollAndExecuteCommands();
void acknowledgeCommand(const String& commandId, const String& status, const String& errorMsg);

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("   AGRICONNECT ESP32 LIVE IoT HARDWARE NODE      ");
  Serial.println("==================================================");
  Serial.print("Device UID: "); Serial.println(DEVICE_UID);
  Serial.print("Server API: "); Serial.println(AGRI_SERVER_BASE);
  Serial.println("--------------------------------------------------");

  pinMode(PIN_PUMP_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_FENCE_LASER, OUTPUT);
  pinMode(PIN_FENCE_LDR, INPUT);

  setRelayState(PIN_PUMP_RELAY, false);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_FENCE_LASER, LOW);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SOIL, ADC_11db);
  analogSetPinAttenuation(PIN_RAIN, ADC_11db);

  dht.begin();

#if ENABLE_OLED_DISPLAY
  Wire.begin(OLED_SDA, OLED_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    hasDisplay = true;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(10, 8); display.println("AgriConnect");
    display.setTextSize(2);
    display.setCursor(12, 26); display.println("FARM NODE");
    display.setTextSize(1);
    display.setCursor(15, 50); display.println(DEVICE_UID);
    display.display();
  } else {
    hasDisplay = false;
    Serial.println("[Hardware] OLED Display NOT found! Running headlessly.");
  }
#else
  hasDisplay = false;
#endif

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  checkWifiConnection();
}

void loop() {
  unsigned long now = millis();

  // Task 1: Wi-Fi Reconnect Check
  if (now - lastWifiCheckTime >= WIFI_RECONNECT_INTERVAL_MS || lastWifiCheckTime == 0) {
    lastWifiCheckTime = now;
    checkWifiConnection();
  }

  // Task 2: Sensor Reading
  if (now - lastSensorReadTime >= SENSOR_READ_INTERVAL_MS || lastSensorReadTime == 0) {
    lastSensorReadTime = now;
    readSensors();
  }

  // Task 3: OLED Screen Update
  if (now - lastDisplayUpdateTime >= DISPLAY_UPDATE_INTERVAL_MS || lastDisplayUpdateTime == 0) {
    lastDisplayUpdateTime = now;
    updateDisplay();
  }

  // Task 4: Telemetry POST to Server
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

void checkWifiConnection() {
  wl_status_t status = WiFi.status();
  if (status == WL_CONNECTED) {
    if (currentWifiState != STATE_CONNECTED) {
      currentWifiState = STATE_CONNECTED;
      Serial.println("\n[Wi-Fi] State: CONNECTED");
      Serial.print("[Wi-Fi] IP Address: "); Serial.println(WiFi.localIP());
    }
    return;
  }
  if (currentWifiState == STATE_DISCONNECTED || currentWifiState == STATE_CONNECTED) {
    currentWifiState = STATE_CONNECTING;
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  } else if (currentWifiState == STATE_CONNECTING) {
    currentWifiState = STATE_RECONNECTING;
    WiFi.reconnect();
  }
}

void readSensors() {
  // 1. Soil Moisture
  int rawSoil = analogRead(PIN_SOIL);
  if (rawSoil > 50 && rawSoil < 4050) {
    currentSensors.rawSoil = rawSoil;
    int mapped = map(rawSoil, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
    currentSensors.soilPercent = constrain(mapped, 0, 100);
    currentSensors.soilValid = true;
  } else {
    currentSensors.soilValid = false;
    currentSensors.soilPercent = -1;
  }

  // 2. Rain Sensor
  int rawRain = analogRead(PIN_RAIN);
  if (rawRain > 50 && rawRain < 4050) {
    currentSensors.rawRain = rawRain;
    currentSensors.rainValid = true;
    if (rawRain >= RAIN_DRY_VALUE) currentSensors.rainStatus = "NO_RAIN";
    else if (rawRain >= RAIN_LIGHT_VALUE) currentSensors.rainStatus = "LIGHT_RAIN";
    else if (rawRain >= RAIN_HEAVY_VALUE) currentSensors.rainStatus = "RAIN";
    else currentSensors.rainStatus = "HEAVY_RAIN";
  } else {
    currentSensors.rainValid = false;
    currentSensors.rainStatus = "NOT_CONNECTED";
  }

  // 3. DHT Sensor
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

  // 4. Laser Fence Signal
  int ldrVal = digitalRead(PIN_FENCE_LDR);
  currentSensors.fenceStatus = (ldrVal == HIGH) ? "NORMAL" : "NOT_CONNECTED";
}

void updateDisplay() {
  if (!hasDisplay) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0); display.print("AgriConnect Node");
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  display.setCursor(0, 12);
  display.print(WiFi.status() == WL_CONNECTED ? "WiFi: OK" : "WiFi: Offline");
  display.setCursor(68, 12); display.print(DEVICE_UID);

  display.setCursor(0, 24); display.print("Soil: ");
  if (currentSensors.soilValid) { display.print(currentSensors.soilPercent); display.print("%"); }
  else display.print("N/A");

  display.setCursor(0, 36); display.print("Temp: ");
  if (currentSensors.tempValid) { display.print(currentSensors.temperature, 1); display.print(" C"); }
  else display.print("N/A");

  display.setCursor(0, 48); display.print("Hum:  ");
  if (currentSensors.humValid) { display.print(currentSensors.humidity, 0); display.print("%"); }
  else display.print("N/A");

  display.setCursor(68, 48);
  if (currentSensors.rainValid) display.print(currentSensors.rainStatus.substring(0, 6));
  else display.print("Rain N/A");

  display.display();
}

void sendTelemetryPayload() {
  String url = String(AGRI_SERVER_BASE) + "/telemetry";
  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (url.startsWith("https")) { secureClient.setInsecure(); http.begin(secureClient, url); }
  else http.begin(plainClient, url);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  String json = "{";
  json += "\"deviceUid\":\"" + String(DEVICE_UID) + "\",";
  json += "\"deviceToken\":\"" + String(DEVICE_TOKEN) + "\",";
  json += "\"soilMoisture\":" + (currentSensors.soilValid ? String(currentSensors.soilPercent) : "null") + ",";
  json += "\"temperature\":" + (currentSensors.tempValid ? String(currentSensors.temperature, 1) : "null") + ",";
  json += "\"humidity\":" + (currentSensors.humValid ? String(currentSensors.humidity, 1) : "null") + ",";
  json += "\"rainValue\":" + (currentSensors.rainValid ? String(currentSensors.rawRain) : "null") + ",";
  json += "\"rainStatus\":\"" + (currentSensors.rainValid ? currentSensors.rainStatus : "NOT_CONNECTED") + "\",";
  json += "\"fenceStatus\":\"" + currentSensors.fenceStatus + "\",";
  json += "\"deviceStatus\":\"ONLINE\"}";

  int httpCode = http.POST(json);
  if (httpCode > 0) {
    Serial.println("[Telemetry] Sent successfully. Response Code: " + String(httpCode));
  } else {
    Serial.println("[Telemetry] POST Error: " + String(http.errorToString(httpCode).c_str()));
  }
  http.end();
}

void pollAndExecuteCommands() {
  String url = String(AGRI_SERVER_BASE) + "/commands?deviceUid=" + String(DEVICE_UID);
  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (url.startsWith("https")) { secureClient.setInsecure(); http.begin(secureClient, url); }
  else http.begin(plainClient, url);

  http.addHeader("x-device-token", DEVICE_TOKEN);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    int cmdIdx = payload.indexOf("\"command\":\"");
    while (cmdIdx != -1) {
      int cmdStart = cmdIdx + 11;
      int cmdEnd = payload.indexOf("\"", cmdStart);
      String commandName = payload.substring(cmdStart, cmdEnd);

      int idIdx = payload.lastIndexOf("\"id\":\"", cmdIdx);
      String commandId = "";
      if (idIdx != -1) {
        int idStart = idIdx + 6;
        int idEnd = payload.indexOf("\"", idStart);
        commandId = payload.substring(idStart, idEnd);
      }

      bool success = true;
      String errMessage = "";

      if (commandName == "PUMP_ON") setRelayState(PIN_PUMP_RELAY, true);
      else if (commandName == "PUMP_OFF") setRelayState(PIN_PUMP_RELAY, false);
      else if (commandName == "BUZZER_ON") digitalWrite(PIN_BUZZER, HIGH);
      else if (commandName == "BUZZER_OFF") digitalWrite(PIN_BUZZER, LOW);
      else if (commandName == "ARM_FENCE") digitalWrite(PIN_FENCE_LASER, HIGH);
      else if (commandName == "DISARM_FENCE") digitalWrite(PIN_FENCE_LASER, LOW);
      else { success = false; errMessage = "Unsupported command: " + commandName; }

      if (commandId.length() > 0) {
        acknowledgeCommand(commandId, success ? "EXECUTED" : "FAILED", errMessage);
      }
      cmdIdx = payload.indexOf("\"command\":\"", cmdEnd);
    }
  }
  http.end();
}

void acknowledgeCommand(const String& commandId, const String& status, const String& errorMsg) {
  String url = String(AGRI_SERVER_BASE) + "/command-ack";
  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (url.startsWith("https")) { secureClient.setInsecure(); http.begin(secureClient, url); }
  else http.begin(plainClient, url);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  String json = "{\"deviceUid\":\"" + String(DEVICE_UID) + "\",\"deviceToken\":\"" + String(DEVICE_TOKEN) + "\",\"commandId\":\"" + commandId + "\",\"status\":\"" + status + "\"";
  if (errorMsg.length() > 0) json += ",\"error\":\"" + errorMsg + "\"";
  json += "}";

  http.POST(json);
  http.end();
}


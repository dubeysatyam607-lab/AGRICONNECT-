/*
 * AgriConnect ESP32 IoT Node Firmware (Production Hardware Build)
 *
 * Micro-controller: ESP32 Dev Module
 * Protocol:        HTTPS REST (telemetry POST + command poll GET + command ack POST)
 * Endpoint base:   config.h → AGRI_SERVER_BASE (default "…/api/iot")
 *
 * The node:
 *   1. Reads REAL sensor values (soil moisture, rain, DHT11 temp/humidity,
 *      fence LDR, pump relay state) and POSTs them every 30 s to /telemetry.
 *   2. Polls /commands every 15 s for queued commands (BUZZER_ON/OFF,
 *      ARM/DISARM_FENCE, PUMP_ON/PUMP_OFF) and physically executes them.
 *   3. POSTs an acknowledgment (EXECUTED/FAILED) to /command-ack so the app
 *      never claims a command was delivered unless the hardware confirms it.
 *
 * Wi-Fi requirement: 2.4 GHz network (ESP32 does NOT support 5 GHz).
 *
 * Steps before flashing:
 *   1. Open the committed `config.h` in this folder and fill in your Wi-Fi
 *      SSID/password, server base URL, device UID + token (placeholders included;
 *      never commit real credentials — this file ships with safe placeholders).
 *   2. Register the same device UID in the AgriConnect app (Add ESP32 Node).
 *   3. Install libraries: ArduinoJson, Adafruit DHT sensor library + Unified
 *      Sensor, and the published board URL for ESP32.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

#include "config.h"

// ── Derived server endpoints ──────────────────────────────────────────────
static const String TELEMETRY_URL = String(AGRI_SERVER_BASE) + "/telemetry";
static const String COMMANDS_URL  = String(AGRI_SERVER_BASE) + "/commands?deviceUid=" + DEVICE_UID;
static const String ACK_URL       = String(AGRI_SERVER_BASE) + "/command-ack";

// ── Device / protocol state ───────────────────────────────────────────────
DHT dht(PIN_DHT, DHTTYPE);
unsigned long lastTelemetryTime = 0;
unsigned long lastCommandPoll   = 0;

// Poor-man's ack store: track the most recent command until it is acked.
String pendingCommandId = "";
String pendingCommand   = "";

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=============================================");
  Serial.println("  AgriConnect ESP32 Hardware Node Starting");
  Serial.printf("  Device UID: %s\n", DEVICE_UID);
  Serial.println("=============================================");

  dht.begin();
  pinMode(PIN_SOIL, INPUT);
  pinMode(PIN_RAIN, INPUT);
  pinMode(PIN_FENCE_LASER, OUTPUT);
  pinMode(PIN_FENCE_LDR, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  digitalWrite(PIN_FENCE_LASER, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_PUMP_RELAY, LOW);

  // FIX for "wifi:sta is connecting, cannot set config" error
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
    Serial.println("\nWi-Fi initial connect timeout. Will keep retrying automatically in the main loop.");
  }
}

void ensureWifi() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi link lost. Attempting reconnection...");
    WiFi.disconnect(true);
    delay(100);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

void loop() {
  unsigned long now = millis();

  ensureWifi();

  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS || lastTelemetryTime == 0) {
    lastTelemetryTime = now;
    sendTelemetry();
  }

  if (now - lastCommandPoll >= COMMAND_POLL_INTERVAL_MS || lastCommandPoll == 0) {
    lastCommandPoll = now;
    pollCommands();
  }

  delay(100);
}

// ── 1. TELEMETRY (POST real sensor values) ────────────────────────────────
void sendTelemetry() {
  int soilRaw = analogRead(PIN_SOIL);
  int rainRaw = analogRead(PIN_RAIN);
  float temp  = dht.readTemperature();
  float humid = dht.readHumidity();
  int fenceBeam = digitalRead(PIN_FENCE_LDR); // HIGH = beam present, LOW = interrupted

  // Adjusted real fence status derived from hardware (only when laser armed)
  const char* fenceStatus = "NOT_CONNECTED";
  if (digitalRead(PIN_FENCE_LASER) == HIGH) {
    fenceStatus = (fenceBeam == HIGH) ? "NORMAL" : "INTRUSION";
  }

  String jsonPayload;
  StaticJsonDocument<256> doc;
  doc["deviceUid"]    = DEVICE_UID;
  doc["soilMoisture"] = soilRaw;
  doc["temperature"]  = isnan(temp) ? 0.0 : temp;
  doc["humidity"]     = isnan(humid) ? 0.0 : humid;
  doc["rainValue"]    = rainRaw;
  doc["fenceStatus"]  = fenceStatus;
  serializeJson(doc, jsonPayload);

  Serial.println("\n--- Real Sensor Telemetry ---");
  Serial.println(jsonPayload);

  int code = httpPostJson(TELEMETRY_URL, jsonPayload);
  if (code > 0) {
    Serial.printf("Telemetry response: %d\n", code);
  }
}

// ── 2. COMMAND POLL (GET /commands) ───────────────────────────────────────
void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = COMMANDS_URL;
  if (String(AGRI_SERVER_BASE).startsWith("https")) {
    WiFiClientSecure client;
    client.setInsecure();
    if (!http.begin(client, url)) {
      http.end();
      return;
    }
  } else {
    WiFiClient client;
    if (!http.begin(client, url)) {
      http.end();
      return;
    }
  }

  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.setTimeout(8000);
  int code = http.GET();

  if (code == HTTP_CODE_OK) {
    String body = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      JsonArray commands = doc["commands"].as<JsonArray>();
      for (JsonObject cmd : commands) {
        const char* id      = cmd["id"];
        const char* command = cmd["command"];
        if (id && command) {
          executeCommand(String(id), String(command));
          break; // one command per poll visit, ack before next
        }
      }
    }
  }
  http.end();
}

// ── 3. COMMAND EXECUTION + ACK ────────────────────────────────────────────
void executeCommand(const String& commandId, const String& command) {
  Serial.printf("Executing hardware command: %s (id=%s)\n", command.c_str(), commandId.c_str());

  String error  = "";
  bool   ok     = true;

  if (command == "BUZZER_ON") {
    digitalWrite(PIN_BUZZER, HIGH);
  } else if (command == "BUZZER_OFF") {
    digitalWrite(PIN_BUZZER, LOW);
  } else if (command == "ARM_FENCE") {
    digitalWrite(PIN_FENCE_LASER, HIGH);
  } else if (command == "DISARM_FENCE") {
    digitalWrite(PIN_FENCE_LASER, LOW);
  } else if (command == "PUMP_ON") {
    digitalWrite(PIN_PUMP_RELAY, HIGH);
  } else if (command == "PUMP_OFF") {
    digitalWrite(PIN_PUMP_RELAY, LOW);
  } else {
    ok = false;
    error = "UNSUPPORTED_COMMAND";
  }

  sendCommandAck(commandId, ok ? "EXECUTED" : "FAILED", error);
}

void sendCommandAck(const String& commandId, const String& state, const String& error) {
  String jsonPayload;
  StaticJsonDocument<256> doc;
  doc["deviceUid"] = DEVICE_UID;
  doc["commandId"] = commandId;
  doc["status"]    = state;
  if (error.length() > 0) doc["error"] = error;
  serializeJson(doc, jsonPayload);

  int code = httpPostJson(ACK_URL, jsonPayload);
  Serial.printf("Command ack (%s): %d\n", state.c_str(), code);
}

// ── HTTP helper (supports http + https) ───────────────────────────────────
int httpPostJson(const String& url, const String& payload) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  HTTPClient http;
  if (url.startsWith("https")) {
    WiFiClientSecure client;
    client.setInsecure();
    if (!http.begin(client, url)) {
      http.end();
      return -1;
    }
  } else {
    WiFiClient client;
    if (!http.begin(client, url)) {
      http.end();
      return -1;
    }
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.setTimeout(10000);
  int code = http.POST(payload);
  if (code > 0) {
    Serial.println(http.getString());
  }
  http.end();
  return code;
}
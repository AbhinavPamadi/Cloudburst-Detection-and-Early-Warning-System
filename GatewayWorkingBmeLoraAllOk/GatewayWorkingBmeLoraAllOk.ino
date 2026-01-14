/*
 * ROBUST IOT GATEWAY - FIREBASE EDITION (Updated for STM32 Compatibility)
 * Hardware: NodeMCU ESP8266 + LoRa Ra-02 + BME280
 * wiring: 
 * - SDA -> D3 (GPIO0)
 * - SCL -> D1 (GPIO5)
 */

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <SPI.h>
#include <LoRa.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h> 

// ═══════════════════════════════════════════════════════════════
// USER CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const char* WIFI_SSID = "Jarvis";
const char* WIFI_PASS = "Pixies@1915";

#define FIREBASE_HOST "https://cloudburst-detection-sih-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "msmKX3tPxvFboVm2fVp4iPB8SaMvx9j6461KIVR4"

#define LORA_NSS  D8
#define LORA_RST  D4
#define LORA_DIO0 D2
#define LORA_BAND 433E6

// BME280 Custom I2C Pins
#define BME_SDA_PIN 0  // GPIO0 (D3)
#define BME_SCL_PIN 5  // GPIO5 (D1)

const long GATEWAY_UPLOAD_INTERVAL = 5000; 

// ═══════════════════════════════════════════════════════════════
// GLOBAL OBJECTS
// ═══════════════════════════════════════════════════════════════
FirebaseData fbData;
FirebaseConfig fbConfig;
FirebaseAuth fbAuth;

Adafruit_BME280 bme; 

unsigned long lastGatewayUpload = 0;

struct SensorPacket {
  String nodeId;
  float temp;
  float humidity;
  float pressure;
  float rainTotal;
  float rain1Hr;
  float rainRate;
  float gas;
  float altitude;
  int rssi;
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
float getValue(String data, String key) {
  int idx = data.indexOf(key);
  if (idx == -1) return 0.0;
  int start = idx + key.length();
  int comma = data.indexOf(',', start);
  if (comma == -1) return data.substring(start).toFloat();
  return data.substring(start, comma).toFloat();
}

String getStringValue(String data, String key) {
  int idx = data.indexOf(key);
  if (idx == -1) return "Unknown"; 
  int start = idx + key.length();
  int comma = data.indexOf(',', start);
  if (comma == -1) return data.substring(start);
  return data.substring(start, comma);
}

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(9600);
  delay(1000);
  Serial.println("\n\n=== GATEWAY BOOTING ===");

  // 1. Init BME280 (Custom Pins)
  Serial.print("Initializing I2C on SDA:D3, SCL:D1... ");
  Wire.begin(BME_SDA_PIN, BME_SCL_PIN);
  
  // Try Address 0x76 (Common for modules)
  if (!bme.begin(0x76, &Wire)) { 
    Serial.println("Failed at 0x76. Trying 0x77...");
    // Try Address 0x77 (Standard Adafruit)
    if (!bme.begin(0x77, &Wire)) {
       Serial.println("ERROR: BME280 not found! Check wiring.");
    } else {
       Serial.println("BME280 Found at 0x77");
    }
  } else {
    Serial.println("BME280 Found at 0x76");
  }

  // 2. Init LoRa
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("[ERROR] LoRa Init Failed!");
    while (1) delay(100);
  }

  // --- EXPLICIT CONFIG TO MATCH STM32 NODE ---
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0x12); 
  // -------------------------------------------
  
  Serial.println("[OK] LoRa Listening (SF7, BW125, CR4/5, SW0x12)...");

  // 3. Init WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[OK] WiFi Connected: " + WiFi.localIP().toString());

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  
  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  fbData.setBSSLBufferSize(1024, 1024);
  
  Serial.println("[OK] System Ready");
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════
void loop() {
  // --- TASK 1: CHECK FOR REMOTE LORA PACKETS ---
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String incoming = "";
    while (LoRa.available()) {
      incoming += (char)LoRa.read();
    }
    
    Serial.println("\n--- LoRa Packet Received ---");
    // Debug print raw string
    Serial.println("RAW: " + incoming); 

    SensorPacket packet;
    packet.rssi = LoRa.packetRssi();
    packet.nodeId    = getStringValue(incoming, "ID:");
    
    // Parse Standard Environment
    packet.temp      = getValue(incoming, "T:");
    packet.pressure  = getValue(incoming, "P:");
    packet.humidity  = getValue(incoming, "H:");
    
    // Parse Rain Node keys
    packet.rainTotal = getValue(incoming, "RT:");
    packet.rain1Hr   = getValue(incoming, "R1:");
    packet.rainRate  = getValue(incoming, "RR:");

    // Parse BME680 Node keys
    packet.gas       = getValue(incoming, "G:");
    packet.altitude  = getValue(incoming, "A:");

    if (packet.nodeId != "Unknown") {
      uploadRemoteNode(packet);
    }
  }

  // --- TASK 2: READ & UPLOAD LOCAL GATEWAY SENSORS ---
  unsigned long currentMillis = millis();
  if (currentMillis - lastGatewayUpload >= GATEWAY_UPLOAD_INTERVAL) {
    lastGatewayUpload = currentMillis;
    readAndUploadGateway();
  }
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD HANDLER: REMOTE NODES (SENDS ALL DATA)
// ═══════════════════════════════════════════════════════════════
void uploadRemoteNode(SensorPacket p) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("Uploading Remote Node: " + p.nodeId);
  time_t now = time(nullptr);
  String ts = String(now);
  String basePath = "/nodes/" + p.nodeId;

  // ─────────────────────────────────────────
  // REALTIME DATA - UPLOAD ALL FIELDS
  // ─────────────────────────────────────────
  Serial.println("  → Uploading to /realtime/");
  
  // Core Environmental Data
  Firebase.setFloat(fbData, basePath + "/realtime/temperature", p.temp);
  Firebase.setFloat(fbData, basePath + "/realtime/pressure", p.pressure);
  Firebase.setFloat(fbData, basePath + "/realtime/humidity", p.humidity);
  
  // Rain Data (Always upload, even if zero)
  Firebase.setFloat(fbData, basePath + "/realtime/rain_total", p.rainTotal);
  Firebase.setFloat(fbData, basePath + "/realtime/rain_1hr", p.rain1Hr);
  Firebase.setFloat(fbData, basePath + "/realtime/rain_rate", p.rainRate);
  
  // BME680 Data (Always upload, even if zero)
  Firebase.setFloat(fbData, basePath + "/realtime/gas_resistance", p.gas);
  Firebase.setFloat(fbData, basePath + "/realtime/altitude", p.altitude);
  
  // Metadata
  Firebase.setInt(fbData, basePath + "/realtime/rssi", p.rssi);
  Firebase.setString(fbData, basePath + "/realtime/last_update", ts);
  Firebase.setString(fbData, basePath + "/realtime/status", "ONLINE");

  // ─────────────────────────────────────────
  // HISTORY DATA - UPLOAD ALL FIELDS
  // ─────────────────────────────────────────
  Serial.println("  → Uploading to /history/");
  
  FirebaseJson json;
  json.set("timestamp", ts);
  
  // Core Environmental Data
  json.set("temperature", p.temp);
  json.set("pressure", p.pressure);
  json.set("humidity", p.humidity);
  
  // Rain Data (Always include, even if zero)
  json.set("rain_total", p.rainTotal);
  json.set("rain_1hr", p.rain1Hr);
  json.set("rain_rate", p.rainRate);
  
  // BME680 Data (Always include, even if zero)
  json.set("gas_resistance", p.gas);
  json.set("altitude", p.altitude);
  
  // Metadata
  json.set("rssi", p.rssi);
  
  if (Firebase.pushJSON(fbData, basePath + "/history", json)) {
    Serial.println("[SUCCESS] Remote Node Data Uploaded");
  } else {
    Serial.println("[FAIL] Upload Error: " + fbData.errorReason());
  }
  
  Serial.println("─────────────────────────────────────");
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD HANDLER: LOCAL GATEWAY (BME280)
// ═══════════════════════════════════════════════════════════════
void readAndUploadGateway() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Read BME280
  float temp = bme.readTemperature();
  float pressure = bme.readPressure() / 100.0F; // Pa to hPa
  float humidity = bme.readHumidity();
  
  // Validation
  if (isnan(temp) || isnan(pressure) || isnan(humidity)) {
    Serial.println("[WARN] BME280 Read Failed (NAN)");
    return;
  }

  Serial.println("Uploading Gateway Data... T:" + String(temp) + " H:" + String(humidity));

  time_t now = time(nullptr);
  String ts = String(now);
  String basePath = "/nodes/gateway"; 

  // 1. Update Realtime
  Firebase.setFloat(fbData, basePath + "/realtime/temperature", temp);
  Firebase.setFloat(fbData, basePath + "/realtime/pressure", pressure);
  Firebase.setFloat(fbData, basePath + "/realtime/humidity", humidity);
  Firebase.setString(fbData, basePath + "/realtime/last_update", ts);
  Firebase.setString(fbData, basePath + "/realtime/status", "ONLINE");

  // 2. Append History
  FirebaseJson json;
  json.set("timestamp", ts);
  json.set("temperature", temp);
  json.set("pressure", pressure);
  json.set("humidity", humidity);
  
  if (Firebase.pushJSON(fbData, basePath + "/history", json)) {
    Serial.println("[SUCCESS] Gateway Data Pushed");
  } else {
    Serial.println("[FAIL] Gateway Upload Error: " + fbData.errorReason());
  }
}
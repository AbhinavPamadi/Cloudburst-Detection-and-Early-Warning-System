/*
 * GATEWAY - MINIMAL VERSION (STABLE)
 * NodeMCU ESP8266 + BME280 + LoRa Ra-02
 * 
 * MODIFIED: Firebase data is APPENDED (not replaced)
 * - Maintains history of all readings
 * - Keeps realtime values for quick access
 */

#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <SPI.h>
#include <LoRa.h>
#include <time.h>

// ═══════════════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════
#define LORA_NSS  D8
#define LORA_RST  D4
#define LORA_DIO0 D2
#define BME_SDA   D3
#define BME_SCL   D1
#define LORA_BAND 433E6

// ═══════════════════════════════════════════════════════════════
// WiFi & FIREBASE
// ═══════════════════════════════════════════════════════════════
const char* ssid = "Jarvis";
const char* password = "Pixies@1915";

#define FIREBASE_HOST "https://cloudburst-detection-sih-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "msmKX3tPxvFboVm2fVp4iPB8SaMvx9j6461KIVR4"

// ═══════════════════════════════════════════════════════════════
// THINGSPEAK
// ═══════════════════════════════════════════════════════════════
const char* thingSpeakServer = "api.thingspeak.com";
String thingSpeakApiKey = "962W9NLLOB2L991N";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
#define GATEWAY_UPLOAD_INTERVAL 30000

// ═══════════════════════════════════════════════════════════════
// OBJECTS
// ═══════════════════════════════════════════════════════════════
Adafruit_BME280 bme;
WiFiClient thingSpeakClient;
FirebaseData firebaseData;
FirebaseConfig firebaseConfig;
FirebaseAuth firebaseAuth;

// ═══════════════════════════════════════════════════════════════
// VARIABLES
// ═══════════════════════════════════════════════════════════════
bool bmeFound = false;
unsigned long lastGatewayUploadTime = 0;
unsigned long totalPacketsReceived = 0;

String lastNodeID = "";
float node_temp = 0;
float node_pressure = 0;
float node_altitude = 0;
float node_rainfall = 0;
int node_rssi = 0;

float gw_temp = 0;
float gw_pressure = 0;
float gw_altitude = 0;
float gw_humidity = 0;

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(9600);
  delay(2000);
  
  Serial.println("\n\n================================");
  Serial.println("GATEWAY - APPEND MODE");
  Serial.println("================================\n");

  // I2C & BME280
  Serial.println("Init I2C...");
  Wire.begin(BME_SDA, BME_SCL);
  delay(100);
  
  if (bme.begin(0x76, &Wire) || bme.begin(0x77, &Wire)) {
    Serial.println("BME280 OK!\n");
    bmeFound = true;
    bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::FILTER_OFF,
                    Adafruit_BME280::STANDBY_MS_1000);
  } else {
    Serial.println("BME280 not found\n");
  }

  // LoRa
  Serial.println("Init LoRa...");
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);
  
  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("LoRa FAILED!");
    while(1) delay(1000);
  }
  
  Serial.println("LoRa OK!\n");
  
  LoRa.setTxPower(14);
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(0x12);
  LoRa.enableCrc();

  // WiFi
  Serial.print("WiFi: ");
  WiFi.begin(ssid, password);
  WiFi.mode(WIFI_STA);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi Failed!");
  }

  // Configure NTP for timestamps
  if (WiFi.status() == WL_CONNECTED) {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("Syncing time...");
    delay(2000);
  }

  // Firebase
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nInit Firebase...");
    
    firebaseConfig.host = FIREBASE_HOST;
    firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
    
    Firebase.begin(&firebaseConfig, &firebaseAuth);
    Firebase.reconnectWiFi(true);
    
    delay(100);
    
    if (Firebase.setString(firebaseData, "/system/status", "online")) {
      Serial.println("Firebase OK!\n");
    } else {
      Serial.println("Firebase FAILED!");
      Serial.println(firebaseData.errorReason());
    }
  }

  Serial.println("================================");
  Serial.println("READY - LISTENING");
  Serial.println("================================\n");
  
  lastGatewayUploadTime = millis() - GATEWAY_UPLOAD_INTERVAL + 5000;
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════
void loop() {
  // Check LoRa
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    Serial.println("\n=== LoRa Packet ===");
    
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }
    
    node_rssi = LoRa.packetRssi();
    totalPacketsReceived++;
    
    Serial.print("Data: ");
    Serial.println(received);
    Serial.print("RSSI: ");
    Serial.println(node_rssi);
    
    parseNodeData(received);
    uploadNodeData();
    
    Serial.println("===================\n");
  }
  
  // Gateway upload every 30 sec
  if (millis() - lastGatewayUploadTime >= GATEWAY_UPLOAD_INTERVAL) {
    readGatewaySensor();
    uploadGatewayData();
    lastGatewayUploadTime = millis();
  }
  
  delay(10);
}

// ═══════════════════════════════════════════════════════════════
// GET TIMESTAMP
// ═══════════════════════════════════════════════════════════════
String getTimestamp() {
  time_t now = time(nullptr);
  if (now < 100000) {
    // Time not synced yet, use millis
    return String(millis());
  }
  return String(now);
}

// ═══════════════════════════════════════════════════════════════
// PARSE NODE DATA
// ═══════════════════════════════════════════════════════════════
void parseNodeData(String data) {
  // Extract Node ID
  int idIdx = data.indexOf("ID:");
  int tIdx = data.indexOf(",T:");
  if (idIdx >= 0 && tIdx > idIdx) {
    lastNodeID = data.substring(idIdx + 3, tIdx);
  }
  
  // Extract Temperature
  int pIdx = data.indexOf(",P:");
  if (tIdx >= 0 && pIdx > tIdx) {
    node_temp = data.substring(tIdx + 3, pIdx).toFloat();
  }
  
  // Extract Pressure
  int aIdx = data.indexOf(",A:");
  if (pIdx >= 0 && aIdx > pIdx) {
    node_pressure = data.substring(pIdx + 3, aIdx).toFloat();
  }
  
  // Extract Altitude
  int rIdx = data.indexOf(",R:");
  if (aIdx >= 0 && rIdx > aIdx) {
    node_altitude = data.substring(aIdx + 3, rIdx).toFloat();
  }
  
  // Extract Rainfall
  int cIdx = data.indexOf(",C:");
  if (rIdx >= 0 && cIdx > rIdx) {
    node_rainfall = data.substring(rIdx + 3, cIdx).toFloat();
  }
  
  Serial.print("Node: ");
  Serial.print(lastNodeID);
  Serial.print(" T:");
  Serial.print(node_temp);
  Serial.print(" P:");
  Serial.println(node_pressure);
}

// ═══════════════════════════════════════════════════════════════
// READ GATEWAY SENSOR
// ═══════════════════════════════════════════════════════════════
void readGatewaySensor() {
  if (bmeFound) {
    gw_temp = bme.readTemperature();
    gw_pressure = bme.readPressure() / 100.0F;
    gw_altitude = bme.readAltitude(1013.25);
    gw_humidity = bme.readHumidity();
  }
  
  Serial.println("Gateway sensor read");
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD NODE DATA (APPEND MODE)
// ═══════════════════════════════════════════════════════════════
void uploadNodeData() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("Uploading node...");
  
  String timestamp = getTimestamp();
  
  // Update realtime values (for quick access)
  String realtimePath = "/nodes/" + lastNodeID + "/realtime";
  
  Firebase.setFloat(firebaseData, realtimePath + "/temperature", node_temp);
  delay(50);
  
  Firebase.setFloat(firebaseData, realtimePath + "/pressure", node_pressure);
  delay(50);
  
  Firebase.setFloat(firebaseData, realtimePath + "/altitude", node_altitude);
  delay(50);
  
  Firebase.setInt(firebaseData, realtimePath + "/rssi", node_rssi);
  delay(50);
  
  Firebase.setString(firebaseData, realtimePath + "/status", "online");
  delay(50);
  
  Firebase.setString(firebaseData, realtimePath + "/lastUpdate", timestamp);
  delay(50);
  
  // APPEND to history (preserves all data)
  String historyPath = "/nodes/" + lastNodeID + "/history";
  FirebaseJson json;
  
  json.set("temperature", node_temp);
  json.set("pressure", node_pressure);
  json.set("altitude", node_altitude);
  json.set("rainfall", node_rainfall);
  json.set("rssi", node_rssi);
  json.set("timestamp", timestamp);
  
  if (Firebase.pushJSON(firebaseData, historyPath, json)) {
    Serial.println("Node data appended to history!");
  } else {
    Serial.println("History append failed!");
    Serial.println(firebaseData.errorReason());
  }
  
  // ThingSpeak
  uploadToThingSpeak(node_temp, node_pressure, node_altitude, 0, 1);
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD GATEWAY DATA (APPEND MODE)
// ═══════════════════════════════════════════════════════════════
void uploadGatewayData() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  Serial.println("Uploading gateway...");
  
  String timestamp = getTimestamp();
  
  // Update realtime values
  String realtimePath = "/nodes/gateway/realtime";
  
  Firebase.setFloat(firebaseData, realtimePath + "/temperature", gw_temp);
  delay(50);
  
  Firebase.setFloat(firebaseData, realtimePath + "/pressure", gw_pressure);
  delay(50);
  
  Firebase.setFloat(firebaseData, realtimePath + "/humidity", gw_humidity);
  delay(50);
  
  Firebase.setString(firebaseData, realtimePath + "/status", "online");
  delay(50);
  
  Firebase.setString(firebaseData, realtimePath + "/lastUpdate", timestamp);
  delay(50);
  
  // APPEND to history
  String historyPath = "/nodes/gateway/history";
  FirebaseJson json;
  
  json.set("temperature", gw_temp);
  json.set("pressure", gw_pressure);
  json.set("altitude", gw_altitude);
  json.set("humidity", gw_humidity);
  json.set("timestamp", timestamp);
  
  if (Firebase.pushJSON(firebaseData, historyPath, json)) {
    Serial.println("Gateway data appended to history!");
  } else {
    Serial.println("History append failed!");
    Serial.println(firebaseData.errorReason());
  }
  
  // ThingSpeak
  uploadToThingSpeak(gw_temp, gw_pressure, gw_altitude, gw_humidity, 0);
}

// ═══════════════════════════════════════════════════════════════
// THINGSPEAK UPLOAD
// ═══════════════════════════════════════════════════════════════
void uploadToThingSpeak(float t, float p, float a, float h, int nodeId) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  String url = "/update?api_key=" + thingSpeakApiKey;
  
  if (nodeId == 1) {
    url += "&field1=" + String(t, 1);
    url += "&field2=" + String(p, 1);
    url += "&field3=" + String(a, 1);
    url += "&field8=1";
  } else {
    url += "&field4=" + String(t, 1);
    url += "&field5=" + String(p, 1);
    url += "&field6=" + String(a, 1);
    url += "&field7=" + String(h, 1);
    url += "&field8=0";
  }
  
  if (thingSpeakClient.connect(thingSpeakServer, 80)) {
    thingSpeakClient.print("GET " + url + " HTTP/1.1\r\n");
    thingSpeakClient.print("Host: " + String(thingSpeakServer) + "\r\n");
    thingSpeakClient.print("Connection: close\r\n\r\n");
    
    delay(500);
    thingSpeakClient.stop();
    
    Serial.println("ThingSpeak OK");
  }
}
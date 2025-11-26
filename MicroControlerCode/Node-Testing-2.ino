/*
 * NODE 1 - MINIMAL VERSION
 * Arduino Nano + BMP280 + LoRa Ra-02
 * Format: "ID:node1,T:25.7,P:912.0,A:878.9,R:0.0,C:42"
 */

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <SPI.h>
#include <LoRa.h>

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
#define NODE_ID "node1"              // Change to "node2", "node3" for more nodes
#define TRANSMIT_INTERVAL 30000      // 30 seconds (prototype)

#define LORA_NSS 10
#define LORA_RST 9
#define LORA_DIO0 2
#define LORA_BAND 433E6
#define TX_POWER 14

// ═══════════════════════════════════════════════════════════════
// OBJECTS
// ═══════════════════════════════════════════════════════════════
Adafruit_BMP280 bmp;

// ═══════════════════════════════════════════════════════════════
// VARIABLES
// ═══════════════════════════════════════════════════════════════
float temperature = 0;
float pressure = 0;
float altitude = 0;
float rainfall = 0.0;
unsigned long messageCount = 0;
unsigned long lastTransmitTime = 0;

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(9600);
  delay(2000);
  
  Serial.println("\n================================");
  Serial.print("NODE: ");
  Serial.println(NODE_ID);
  Serial.println("================================\n");

  // I2C & BMP280
  Serial.print("I2C... ");
  Wire.begin();
  delay(200);
  Serial.println("OK");

  Serial.print("BMP280... ");
  if (!bmp.begin(0x76)) {
    Serial.println("FAILED!");
    while (1) blinkError(3);
  }
  Serial.println("OK");
  
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X1,
                  Adafruit_BMP280::SAMPLING_X1,
                  Adafruit_BMP280::FILTER_OFF,
                  Adafruit_BMP280::STANDBY_MS_1);
  delay(200);

  // SPI
  Serial.print("SPI... ");
  SPI.begin();
  delay(100);
  Serial.println("OK");

  // LoRa
  Serial.print("LoRa... ");
  pinMode(LORA_RST, OUTPUT);
  digitalWrite(LORA_RST, LOW);
  delay(100);
  digitalWrite(LORA_RST, HIGH);
  delay(200);
  
  LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);
  
  bool loraOk = false;
  for (int attempt = 0; attempt < 3; attempt++) {
    if (LoRa.begin(LORA_BAND)) {
      loraOk = true;
      break;
    }
    delay(500);
  }
  
  if (!loraOk) {
    Serial.println("FAILED!");
    while (1) blinkError(5);
  }
  Serial.println("OK");

  LoRa.setTxPower(TX_POWER);
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.enableCrc();
  
  Serial.print("Freq: 433 MHz, Interval: ");
  Serial.print(TRANSMIT_INTERVAL / 1000);
  Serial.println(" sec");
  
  Serial.println("\n*** READY ***\n");
  delay(1000);
  
  lastTransmitTime = millis() - TRANSMIT_INTERVAL;
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════
void loop() {
  if (millis() - lastTransmitTime >= TRANSMIT_INTERVAL) {
    readAndTransmit();
    lastTransmitTime = millis();
  }
  
  delay(100);
}

// ═══════════════════════════════════════════════════════════════
// READ & TRANSMIT
// ═══════════════════════════════════════════════════════════════
void readAndTransmit() {
  // Read sensor
  temperature = bmp.readTemperature();
  pressure = bmp.readPressure() / 100.0F;
  altitude = bmp.readAltitude(1013.25);
  rainfall = 0.0;  // Placeholder
  
  // Print
  Serial.println("=== TX #" + String(messageCount) + " ===");
  Serial.print("T:");
  Serial.print(temperature, 1);
  Serial.print(" P:");
  Serial.print(pressure, 1);
  Serial.print(" A:");
  Serial.println(altitude, 1);

  // Build message: ID:node1,T:25.7,P:912.0,A:878.9,R:0.0,C:42
  String message = "ID:" + String(NODE_ID);
  message += ",T:" + String(temperature, 1);
  message += ",P:" + String(pressure, 1);
  message += ",A:" + String(altitude, 1);
  message += ",R:" + String(rainfall, 1);
  message += ",C:" + String(messageCount);

  // Transmit
  LoRa.beginPacket();
  LoRa.print(message);
  LoRa.endPacket();
  
  Serial.println("SENT: " + message);
  Serial.println("===================\n");
  
  messageCount++;
  delay(100);
}

// ═══════════════════════════════════════════════════════════════
// ERROR BLINK
// ═══════════════════════════════════════════════════════════════
void blinkError(int times) {
  pinMode(LED_BUILTIN, OUTPUT);
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN, LOW);
    delay(200);
  }
  delay(1000);
}

/*
 * NOTES:
 * 
 * TO ADD MORE NODES:
 * - Change NODE_ID to "node2", "node3", etc
 * - Upload to different Arduino Nano
 * - Register in website with GPS coordinates
 * 
 * TO ADD RAINFALL SENSOR:
 * - Connect to A0 pin
 * - Read with analogRead(A0)
 * - Update 'rainfall' variable before building message
 * 
 * FOR DEPLOYMENT:
 * - Change TRANSMIT_INTERVAL to 300000 (5 min)
 * - Add sleep mode for battery life
 */
/*
 * STM32G431KB Weather Station Transmitter (GroundStation)
 * Integrates: DFRobot Rain Sensor, BME680, and LoRa SX1278
 * Protocol: Key-Value Pair (Compatible with New Gateway)
 */

#include <Wire.h>
#include <SPI.h>
#include <LoRa.h>
#include "DFRobot_RainfallSensor.h"
#include <Adafruit_Sensor.h>
#include "Adafruit_BME680.h"

// --- LORA PIN DEFINITIONS ---
#define LORA_SCK    PB3   // D13 - SPI1_SCK
#define LORA_MISO   PB4   // D12 - SPI1_MISO
#define LORA_MOSI   PB5   // D11 - SPI1_MOSI
#define LORA_CS     PA11  // D10 (NSS)
#define LORA_RST    PA8   // D9
#define LORA_DIO0   PB6   // D6

// --- LORA CONFIGURATION ---
#define LORA_FREQ              433E6  
#define LORA_BANDWIDTH         125E3
#define LORA_SPREADING_FACTOR  7
#define LORA_CODING_RATE       5
#define LORA_TX_POWER          20

// Custom SPI instance for STM32
SPIClass SPI_1(LORA_MOSI, LORA_MISO, LORA_SCK);

// --- SENSOR OBJECTS ---
DFRobot_RainfallSensor_I2C rainSensor(&Wire);
Adafruit_BME680 bme;

#define SEALEVELPRESSURE_HPA (1013.25)

void setup() {
  // 1. Initialize Serial
  Serial.begin(115200);
  delay(2000); 
  
  Serial.println("=== STM32 GroundStation Initializing ===");

  // 2. Initialize I2C
  Wire.begin();
  
  // 3. Initialize LoRa
  Serial.println("\n--- Initializing LoRa ---");
  
  SPI_1.begin();
  LoRa.setSPI(SPI_1);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  // Manual reset of LoRa module
  pinMode(LORA_RST, OUTPUT);
  digitalWrite(LORA_RST, LOW);
  delay(10);
  digitalWrite(LORA_RST, HIGH);
  delay(10);

  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("LoRa init failed!");
    Serial.println("Check connections: SCK=D13, MISO=D12, MOSI=D11, CS=D10, RST=D9, DIO0=D6");
    while (1); 
  }
  
  // Apply LoRa Config
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.setSpreadingFactor(LORA_SPREADING_FACTOR);
  LoRa.setCodingRate4(LORA_CODING_RATE);
  LoRa.setTxPower(LORA_TX_POWER);
  LoRa.setSyncWord(0x12); // IMPORTANT: Must match Gateway Sync Word
  LoRa.enableCrc();
  Serial.println("LoRa Initialized Successfully!");

  // 4. Initialize Rain Sensor
  Serial.println("\n--- Initializing Rain Sensor ---");
  int retryCount = 0;
  while(!rainSensor.begin()) {
    Serial.println("Rain sensor init error! Checking I2C...");
    delay(1000);
    retryCount++;
    if(retryCount > 5) {
        Serial.println("WARNING: Rain Sensor not found. Continuing with BME only...");
        break; 
    }
  }
  if (retryCount <= 5) {
      Serial.println("Rain sensor initialized!");
  }
  
  // 5. Initialize BME680
  Serial.println("\n--- Initializing BME680 ---");
  if (!bme.begin(0x77)) {
    Serial.println("BME680 sensor init error! Check connections.");
    while (1); 
  }
  
  // Configure BME680
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150); 
  Serial.println("BME680 initialized!");

  Serial.println("\n=== Setup Complete ===\n");
  delay(1000);
}

void loop() {
  Serial.println("========================================");
  
  // --- READ SENSORS ---
  
  // 1. Rain Data
  float totalRainfall = rainSensor.getRainfall();
  float rain1Hour = rainSensor.getRainfall(1); 
  float rainRate = rain1Hour; // Rate is equivalent to 1h rainfall
  
  // 2. BME Data
  float temp = 0.0, hum = 0.0, press = 0.0;
  
  if (bme.performReading()) {
    temp = bme.temperature;
    hum = bme.humidity;
    press = bme.pressure / 100.0;
  } else {
    Serial.println("Error: Failed to read BME680!");
  }

  // --- SERIAL DEBUG OUTPUT ---
  Serial.print("Temp: "); Serial.print(temp); Serial.println(" C");
  Serial.print("Total Rain: "); Serial.print(totalRainfall); Serial.println(" mm");

  // --- LORA TRANSMISSION (NEW FORMAT) ---
  Serial.print("Sending LoRa packet... ");
  
  LoRa.beginPacket();
  
  // Format: ID:GroundStation,T:25,P:1013,H:60,RT:10,R1:2,RR:5
  LoRa.print("ID:GroundStation");
  
  LoRa.print(",T:");
  LoRa.print(temp);
  
  LoRa.print(",P:");
  LoRa.print(press);
  
  LoRa.print(",H:");
  LoRa.print(hum);
  
  LoRa.print(",RT:");
  LoRa.print(totalRainfall);
  
  LoRa.print(",R1:");
  LoRa.print(rain1Hour);
  
  LoRa.print(",RR:");
  LoRa.print(rainRate);
  
  LoRa.endPacket();
  Serial.println("Sent!");
  
  Serial.println("========================================\n");
  
  // Wait 15 seconds (Standard interval for gateways)
  delay(15000);
}


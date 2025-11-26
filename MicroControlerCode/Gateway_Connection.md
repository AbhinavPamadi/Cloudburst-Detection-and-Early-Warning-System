# *GATEWAY CIRCUIT CONNECTIONS (CORRECTED)*
## *NodeMCU ESP8266 + Ra-02 LoRa + BME280 Sensor*

---

## *COMPLETE CONNECTION DIAGRAM*


╔═══════════════════════════════════════════════════════════════╗
║     NodeMCU ESP8266 + LoRa Ra-02 + BME280 (GATEWAY)          ║
║            Cloudburst Detection - Gateway Node                ║
║              (Based on Your Working Configuration)            ║
╚═══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
POWER SUPPLY
═══════════════════════════════════════════════════════════════
NodeMCU USB Port  →  Connect to Laptop/Computer/Power Bank (5V)


═══════════════════════════════════════════════════════════════
BME280 SENSOR (4-pin I2C - Temperature, Pressure, Humidity)
═══════════════════════════════════════════════════════════════
BME280 VCC  →  NodeMCU 3.3V pin
BME280 GND  →  NodeMCU GND
BME280 SCL  →  NodeMCU D1 (GPIO5)
BME280 SDA  →  NodeMCU D3 (GPIO0)


═══════════════════════════════════════════════════════════════
LoRa Ra-02 MODULE (433 MHz Wireless Receiver/Transmitter)
═══════════════════════════════════════════════════════════════
LoRa VCC (Power)       →  NodeMCU 3.3V pin
LoRa GND (Ground)      →  NodeMCU GND
LoRa MISO (SPI)        →  NodeMCU D6 (GPIO12)
LoRa MOSI (SPI)        →  NodeMCU D7 (GPIO13)
LoRa SCK (SPI Clock)   →  NodeMCU D5 (GPIO14)
LoRa NSS/CS (Select)   →  NodeMCU D8 (GPIO15)
LoRa RESET             →  NodeMCU D4 (GPIO2)
LoRa DIO0              →  NodeMCU D2 (GPIO4)
LoRa ANT (Antenna)     →  433 MHz Antenna Wire


═══════════════════════════════════════════════════════════════
POWER RAIL SUMMARY (3.3V Distribution from NodeMCU)
═══════════════════════════════════════════════════════════════
NodeMCU 3.3V pin connects to:
  ├─→ BME280 VCC
  └─→ LoRa VCC


═══════════════════════════════════════════════════════════════
GROUND RAIL SUMMARY (Common Ground)
═══════════════════════════════════════════════════════════════
NodeMCU GND connects to:
  ├─→ BME280 GND
  └─→ LoRa GND


---

## *PIN ASSIGNMENT TABLE (CORRECTED)*


╔════════════════════════════════════════════════════════════════╗
║              NodeMCU ESP8266 PIN USAGE (GATEWAY)               ║
║                  *** CORRECTED PINOUT ***                      ║
╠════════════════════════════════════════════════════════════════╣
║ NodeMCU Pin │  GPIO  │  Connection      │  Purpose             ║
╠═════════════╪════════╪══════════════════╪══════════════════════╣
║  3.3V       │   -    │  Power Rail      │  BME280 + LoRa Power ║
║  GND        │   -    │  Ground Rail     │  Common Ground       ║
║  D1         │  GPIO5 │  BME280 SCL      │  I2C Clock           ║
║  D2         │  GPIO4 │  LoRa DIO0       │  LoRa Interrupt      ║
║  D3         │  GPIO0 │  BME280 SDA      │  I2C Data            ║
║  D4         │  GPIO2 │  LoRa RESET      │  LoRa Reset          ║
║  D5         │  GPIO14│  LoRa SCK        │  SPI Clock           ║
║  D6         │  GPIO12│  LoRa MISO       │  SPI Data In         ║
║  D7         │  GPIO13│  LoRa MOSI       │  SPI Data Out        ║
║  D8         │  GPIO15│  LoRa NSS/CS     │  LoRa Chip Select    ║
║  USB        │   -    │  Power Source    │  5V USB Input        ║
╚═════════════╧════════╧══════════════════╧══════════════════════╝


---

## *CHANGES FROM PREVIOUS VERSION*


╔══════════════════════════════════════════════════════════════╗
║  Signal    │  Old Pin      │  New Pin (Working)  │  GPIO    ║
╠════════════╪═══════════════╪═════════════════════╪══════════╣
║  LoRa RST  │  D0 (GPIO16) │  D4 (GPIO2)         │  GPIO2   ║
║  LoRa DIO0 │  D3 (GPIO0)  │  D2 (GPIO4)         │  GPIO4   ║
║  BME SDA   │  D2 (GPIO4)  │  D3 (GPIO0)         │  GPIO0   ║
║  BME SCL   │  D1 (GPIO5)  │  D1 (GPIO5)         │  GPIO5   ║ (Same)
║  LoRa NSS  │  D8 (GPIO15) │  D8 (GPIO15)        │  GPIO15  ║ (Same)
╚════════════╧═══════════════╧═════════════════════╧══════════╝

IMPORTANT: These pin assignments are based on your working code!


---

## *COMPONENT SUMMARY*


╔═══════════════════════════════════════════════════════════════╗
║                    GATEWAY PARTS LIST                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Qty  │  Component                │  Purpose                  ║
╠═══════╪═══════════════════════════╪═══════════════════════════╣
║   1   │  NodeMCU ESP8266 v1.0     │  WiFi Gateway Controller  ║
║   1   │  BME280 Sensor (I2C)      │  Temp/Pressure/Humidity   ║
║   1   │  LoRa Ra-02 Module        │  433MHz receiver/TX       ║
║   1   │  433MHz Antenna           │  LoRa antenna             ║
║   1   │  USB Cable                │  Power & programming      ║
║   -   │  Breadboard + Wires       │  Prototyping              ║
╚═══════╧═══════════════════════════╧═══════════════════════════╝


---

## *IMPORTANT NOTES*


✓  CONFIGURATION:
─────────────────────────────────────────────────────────────────
• Serial Baud Rate: 9600 (change Serial Monitor to 9600!)
• LoRa Frequency: 433 MHz (matches Node 1)
• LoRa Settings: SF7, BW125 kHz, CR4/5, CRC enabled
• BME280 I2C Address: Auto-detected (0x76 or 0x77)
• I2C Scanner included for diagnostics

⚠  CRITICAL:
─────────────────────────────────────────────────────────────────
1. Set Serial Monitor to 9600 baud (not 115200!)
2. LoRa MUST have antenna connected
3. Node 1 must also use 433 MHz (check your Node 1 code!)
4. Press RESET button after upload to see output


---

## *WIRING CHECKLIST (UPDATED)*


□  NodeMCU plugged into USB power
□  BME280 VCC → NodeMCU 3.3V
□  BME280 GND → NodeMCU GND
□  BME280 SCL → NodeMCU D1 ✓
□  BME280 SDA → NodeMCU D3 ✓ (CHANGED!)
□  LoRa VCC → NodeMCU 3.3V
□  LoRa GND → NodeMCU GND
□  LoRa MISO → NodeMCU D6
□  LoRa MOSI → NodeMCU D7
□  LoRa SCK → NodeMCU D5
□  LoRa NSS → NodeMCU D8
□  LoRa RST → NodeMCU D4 ✓ (CHANGED!)
□  LoRa DIO0 → NodeMCU D2 ✓ (CHANGED!)
□  433 MHz antenna connected to LoRa ANT pin


---

## *SERIAL MONITOR SETUP*


1. Open Serial Monitor (Tools → Serial Monitor)
2. Set baud rate to: 9600 ✓
3. Set line ending to: "Both NL & CR" or "Newline"
4. Upload code
5. Press RESET button on NodeMCU
6. You should see output immediately!

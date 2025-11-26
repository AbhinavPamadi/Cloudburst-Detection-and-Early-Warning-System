╔═══════════════════════════════════════════════════════════════╗
║        ARDUINO NANO + BMP280 + LoRa Ra-02 + AMS1117          ║
║                   WEATHER STATION                             ║
╚═══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
POWER SUPPLY
═══════════════════════════════════════════════════════════════
Arduino Nano USB Port  →  Connect to Laptop/Computer (5V power)


═══════════════════════════════════════════════════════════════
AMS1117-3.3V VOLTAGE REGULATOR
═══════════════════════════════════════════════════════════════
AMS1117 Pin 1 (INPUT)  →  Arduino Nano 5V pin
AMS1117 Pin 2 (GND)    →  Arduino Nano GND pin
AMS1117 Pin 3 (OUTPUT) →  3.3V Power Rail (goes to multiple components)


═══════════════════════════════════════════════════════════════
100µF CAPACITOR (Power Filtering)
═══════════════════════════════════════════════════════════════
100µF Cap (+) Positive  →  AMS1117 OUTPUT (3.3V rail)
100µF Cap (-) Negative  →  Arduino Nano GND


═══════════════════════════════════════════════════════════════
BMP280 SENSOR (6 pins - Temperature & Pressure)
═══════════════════════════════════════════════════════════════
BMP280 Pin 1 (VCC)  →  AMS1117 OUTPUT (3.3V rail)
BMP280 Pin 2 (GND)  →  Arduino Nano GND
BMP280 Pin 3 (SCL)  →  Arduino Nano A5
BMP280 Pin 4 (SDA)  →  Arduino Nano A4
BMP280 Pin 5 (CSB)  →  AMS1117 OUTPUT (3.3V rail) [SAME AS VCC]
BMP280 Pin 6 (SDO)  →  Arduino Nano GND [Sets I2C address to 0x76]


═══════════════════════════════════════════════════════════════
LoRa Ra-02 MODULE (433 MHz Wireless Transmitter)
═══════════════════════════════════════════════════════════════
LoRa VCC (Power)       →  AMS1117 OUTPUT (3.3V rail)
LoRa GND (Ground)      →  Arduino Nano GND
LoRa MSO/MISO (SPI)    →  Arduino Nano D12
LoRa MSI/MOSI (SPI)    →  Arduino Nano D11
LoRa SCK (SPI Clock)   →  Arduino Nano D13
LoRa NSS/CS (Select)   →  Arduino Nano D10
LoRa RESET             →  Arduino Nano D9
LoRa DIO0              →  Arduino Nano D2
LoRa ANT (Antenna)     →  433 MHz Antenna Wire


═══════════════════════════════════════════════════════════════
POWER RAIL SUMMARY (3.3V Distribution from AMS1117)
═══════════════════════════════════════════════════════════════
AMS1117 OUTPUT (3.3V) connects to:
  ├─→ 100µF Capacitor (+)
  ├─→ BMP280 VCC
  ├─→ BMP280 CSB
  └─→ LoRa VCC


═══════════════════════════════════════════════════════════════
GROUND RAIL SUMMARY (Common Ground)
═══════════════════════════════════════════════════════════════
Arduino Nano GND connects to:
  ├─→ AMS1117 GND (Pin 2)
  ├─→ 100µF Capacitor (-)
  ├─→ BMP280 GND
  ├─→ BMP280 SDO
  └─→ LoRa GND
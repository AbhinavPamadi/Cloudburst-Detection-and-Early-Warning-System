# Cloud-Burst Detection System

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb?logo=react)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime%20DB-orange?logo=firebase)](https://firebase.google.com/)

A comprehensive IoT-based real-time weather monitoring and cloud-burst prediction system that combines hardware sensor networks, machine learning, and a modern web dashboard to detect and alert communities about extreme weather events.

---

## Table of Contents

- [About the Project](#about-the-project)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [Hardware Setup](#hardware-setup)
  - [Sensor Node (Arduino Nano)](#sensor-node-arduino-nano)
  - [Gateway Node (NodeMCU ESP8266)](#gateway-node-nodemcu-esp8266)
- [Software Setup](#software-setup)
- [SMS Notification System](#sms-notification-system)
- [Machine Learning Model](#machine-learning-model)
- [Usage Guide](#usage-guide)
- [Deployment](#deployment)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## About the Project

### What is a Cloudburst?

A **cloudburst** is a sudden, intense rainfall event (100+ mm/hour) that can cause flash floods, landslides, and significant damage to life and property. These events are becoming more frequent due to climate change and pose serious threats to communities, especially in mountainous and urban areas.

### The Problem

- Cloudbursts occur with little to no warning
- Cause devastating flash floods and landslides
- Threaten lives and infrastructure in vulnerable areas
- Existing weather systems often fail to provide localized, real-time alerts

### Our Solution

This system provides a **comprehensive, end-to-end solution** for cloud-burst detection and early warning:

1. **Real-Time Monitoring**: Distributed IoT sensor networks continuously collect meteorological data
2. **Machine Learning Prediction**: XGBoost models analyze patterns to predict cloudburst events
3. **Instant Alerts**: Automated SMS and app notifications to registered contacts and authorities
4. **Interactive Dashboard**: Live visualization of sensor data, predictions, and historical trends
5. **Multi-Language Support**: Accessible in 7 Indian languages for wider reach

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CLOUD-BURST DETECTION SYSTEM                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐        ┌──────────────────────┐
│   SENSOR NODE 1      │        │   SENSOR NODE 2      │
│  Arduino Nano        │        │  Arduino Nano        │
│  + BMP280            │        │  + BMP280            │
│  + LoRa Ra-02        │        │  + LoRa Ra-02        │
└──────────┬───────────┘        └──────────┬───────────┘
           │                               │
           │    433 MHz LoRa Network      │
           └───────────┬───────────────────┘
                       ↓
              ┌─────────────────┐
              │  GATEWAY NODE   │
              │  NodeMCU ESP8266│
              │  + BME280       │
              │  + LoRa Ra-02   │
              │  + WiFi         │
              └────────┬────────┘
                       │
                       ↓ WiFi/Internet
              ┌─────────────────┐
              │  FIREBASE       │
              │  Realtime DB    │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
┌───────────────┐ ┌──────────┐ ┌──────────────┐
│  WEB DASHBOARD│ │ ML MODEL │ │ SMS SERVICE  │
│  Next.js      │ │ XGBoost  │ │ Twilio API   │
│  + Live Maps  │ │ Predict  │ │ Alerts       │
└───────────────┘ └──────────┘ └──────────────┘
        ↓              ↓              ↓
┌───────────────────────────────────────────┐
│           END USERS & AUTHORITIES         │
│  Real-time Data | Predictions | Alerts   │
└───────────────────────────────────────────┘
```

---

## Key Features

### Real-Time Monitoring

- **Live Sensor Data**: Temperature, pressure, humidity, altitude
- **Interactive Maps**: Leaflet-based visualization of sensor locations
- **Node Status Tracking**: Online/offline status with last update times
- **Historical Data**: Complete data history stored and visualized

### Machine Learning Predictions

- **XGBoost Model**: Trained on historical weather data
- **Cloudburst Forecasting**: Predict events 24 hours in advance
- **Feature Engineering**: Multi-parameter analysis (temp, pressure, humidity, wind)
- **Confidence Scores**: Prediction reliability metrics

### Alert Management

- **Automated Alerts**: Create and broadcast warnings instantly
- **SMS Notifications**: Twilio integration for instant text alerts
- **Contact Management**: Organize recipients by location/zone
- **Alert History**: Track all alerts with acknowledgment status
- **Severity Levels**: Critical, warning, info classifications

### Data Visualization

- **Live Graphs**: Real-time charts with Recharts
- **Historical Trends**: View data over custom time periods
- **Multi-Node Comparison**: Compare data across sensor locations
- **Export Capabilities**: Download data for analysis

### Multi-Language Support

- **7 Languages**: English, Hindi, Bengali, Kannada, Marathi, Tamil, Telugu
- **Instant Switching**: Change language without page reload
- **Complete Translation**: All UI elements localized

### Modern UI/UX

- **Dark/Light Mode**: Comfortable viewing in any environment
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Intuitive Navigation**: Easy-to-use interface for all users
- **Real-Time Updates**: Live data without page refreshes

---

## Hardware Setup

### Sensor Node (Arduino Nano)

**Purpose**: Remote weather stations that collect and transmit sensor data via LoRa radio.

#### Components Required

| Component          | Specification          | Quantity |
| ------------------ | ---------------------- | -------- |
| Arduino Nano       | ATmega328P, 5V         | 1        |
| BMP280 Sensor      | Temperature & Pressure | 1        |
| LoRa Ra-02 Module  | 433 MHz                | 1        |
| AMS1117 Regulator  | 3.3V                   | 1        |
| Capacitor          | 100µF                  | 1        |
| 433 MHz Antenna    | Spring/Wire            | 1        |
| Breadboard & Wires | -                      | 1 set    |

#### Wiring Diagram

```
╔═══════════════════════════════════════════════════════════════╗
║        ARDUINO NANO + BMP280 + LoRa Ra-02 + AMS1117          ║
╚═══════════════════════════════════════════════════════════════╝

POWER SUPPLY
────────────────────────────────────────────────────────────────
Arduino Nano USB Port  →  5V (from computer/power bank)

AMS1117 3.3V VOLTAGE REGULATOR
────────────────────────────────────────────────────────────────
AMS1117 Pin 1 (INPUT)  →  Arduino Nano 5V
AMS1117 Pin 2 (GND)    →  Arduino Nano GND
AMS1117 Pin 3 (OUTPUT) →  3.3V Power Rail

100µF CAPACITOR (Power Filtering)
────────────────────────────────────────────────────────────────
100µF Cap (+)  →  AMS1117 OUTPUT (3.3V rail)
100µF Cap (-)  →  Arduino Nano GND

BMP280 SENSOR (Temperature & Pressure)
────────────────────────────────────────────────────────────────
BMP280 VCC  →  AMS1117 OUTPUT (3.3V)
BMP280 GND  →  Arduino Nano GND
BMP280 SCL  →  Arduino Nano A5
BMP280 SDA  →  Arduino Nano A4
BMP280 CSB  →  AMS1117 OUTPUT (3.3V) [same as VCC]
BMP280 SDO  →  Arduino Nano GND [sets I2C address to 0x76]

LoRa Ra-02 MODULE (433 MHz Transmitter)
────────────────────────────────────────────────────────────────
LoRa VCC        →  AMS1117 OUTPUT (3.3V)
LoRa GND        →  Arduino Nano GND
LoRa MISO       →  Arduino Nano D12
LoRa MOSI       →  Arduino Nano D11
LoRa SCK        →  Arduino Nano D13
LoRa NSS/CS     →  Arduino Nano D10
LoRa RESET      →  Arduino Nano D9
LoRa DIO0       →  Arduino Nano D2
LoRa ANT        →  433 MHz Antenna Wire

COMMON CONNECTIONS
────────────────────────────────────────────────────────────────
3.3V Rail: AMS1117 OUTPUT → 100µF Cap (+) → BMP280 VCC →
           BMP280 CSB → LoRa VCC

GND Rail:  Arduino GND → AMS1117 GND → 100µF Cap (-) →
           BMP280 GND → BMP280 SDO → LoRa GND
```

#### Pin Connections Table

| Component | Pin  | Arduino Nano       |
| --------- | ---- | ------------------ |
| BMP280    | VCC  | 3.3V (via AMS1117) |
| BMP280    | GND  | GND                |
| BMP280    | SCL  | A5                 |
| BMP280    | SDA  | A4                 |
| LoRa      | VCC  | 3.3V (via AMS1117) |
| LoRa      | GND  | GND                |
| LoRa      | MISO | D12                |
| LoRa      | MOSI | D11                |
| LoRa      | SCK  | D13                |
| LoRa      | NSS  | D10                |
| LoRa      | RST  | D9                 |
| LoRa      | DIO0 | D2                 |

#### Code Upload

1. **Install Arduino IDE**: Download from [arduino.cc](https://www.arduino.cc/en/software)

2. **Install Required Libraries**:

   - Go to `Sketch` → `Include Library` → `Manage Libraries`
   - Install:
     - `Adafruit BMP280 Library`
     - `Adafruit Unified Sensor`
     - `LoRa by Sandeep Mistry`

3. **Upload Code**:

   - Open `MicroControlerCode/Node-Testing-2.ino`
   - Change `NODE_ID` if deploying multiple nodes:
     ```cpp
     #define NODE_ID "node1"  // Change to node2, node3, etc.
     ```
   - Select `Tools` → `Board` → `Arduino Nano`
   - Select `Tools` → `Processor` → `ATmega328P (Old Bootloader)`
   - Connect Arduino via USB
   - Click `Upload` ✓

4. **Verify Operation**:
   - Open `Tools` → `Serial Monitor` (set to 9600 baud)
   - You should see: `NODE: node1` followed by sensor readings
   - Look for: ` LoRa transmission successful`

---

### Gateway Node (NodeMCU ESP8266)

**Purpose**: Central hub that receives LoRa data from sensor nodes and uploads to Firebase via WiFi.

#### Components Required

| Component          | Specification            | Quantity |
| ------------------ | ------------------------ | -------- |
| NodeMCU ESP8266    | v1.0 with WiFi           | 1        |
| BME280 Sensor      | Temp, Pressure, Humidity | 1        |
| LoRa Ra-02 Module  | 433 MHz                  | 1        |
| 433 MHz Antenna    | Spring/Wire              | 1        |
| Breadboard & Wires | -                        | 1 set    |

#### Wiring Diagram

```
╔═══════════════════════════════════════════════════════════════╗
║     NodeMCU ESP8266 + LoRa Ra-02 + BME280 (GATEWAY)          ║
╚═══════════════════════════════════════════════════════════════╝

POWER SUPPLY
────────────────────────────────────────────────────────────────
NodeMCU USB Port  →  5V (from computer/power bank/wall adapter)

BME280 SENSOR (Temperature, Pressure, Humidity)
────────────────────────────────────────────────────────────────
BME280 VCC  →  NodeMCU 3.3V
BME280 GND  →  NodeMCU GND
BME280 SCL  →  NodeMCU D1 (GPIO5)
BME280 SDA  →  NodeMCU D3 (GPIO0)

LoRa Ra-02 MODULE (433 MHz Receiver/Transmitter)
────────────────────────────────────────────────────────────────
LoRa VCC        →  NodeMCU 3.3V
LoRa GND        →  NodeMCU GND
LoRa MISO       →  NodeMCU D6 (GPIO12)
LoRa MOSI       →  NodeMCU D7 (GPIO13)
LoRa SCK        →  NodeMCU D5 (GPIO14)
LoRa NSS/CS     →  NodeMCU D8 (GPIO15)
LoRa RESET      →  NodeMCU D4 (GPIO2)
LoRa DIO0       →  NodeMCU D2 (GPIO4)
LoRa ANT        →  433 MHz Antenna Wire

COMMON CONNECTIONS
────────────────────────────────────────────────────────────────
3.3V Rail: NodeMCU 3.3V → BME280 VCC → LoRa VCC
GND Rail:  NodeMCU GND → BME280 GND → LoRa GND
```

#### Pin Connections Table

| Component | Pin  | NodeMCU Pin | GPIO   |
| --------- | ---- | ----------- | ------ |
| BME280    | VCC  | 3.3V        | -      |
| BME280    | GND  | GND         | -      |
| BME280    | SCL  | D1          | GPIO5  |
| BME280    | SDA  | D3          | GPIO0  |
| LoRa      | VCC  | 3.3V        | -      |
| LoRa      | GND  | GND         | -      |
| LoRa      | MISO | D6          | GPIO12 |
| LoRa      | MOSI | D7          | GPIO13 |
| LoRa      | SCK  | D5          | GPIO14 |
| LoRa      | NSS  | D8          | GPIO15 |
| LoRa      | RST  | D4          | GPIO2  |
| LoRa      | DIO0 | D2          | GPIO4  |

#### Code Upload & Configuration

1. **Install Arduino IDE** (if not already installed)

2. **Add ESP8266 Board Support**:

   - Go to `File` → `Preferences`
   - In "Additional Boards Manager URLs", add:
     ```
     http://arduino.esp8266.com/stable/package_esp8266com_index.json
     ```
   - Go to `Tools` → `Board` → `Boards Manager`
   - Search "ESP8266" and install

3. **Install Required Libraries**:

   - `Adafruit BME280 Library`
   - `Adafruit Unified Sensor`
   - `LoRa by Sandeep Mistry`
   - `Firebase ESP8266 Client`

4. **Configure WiFi & Firebase**:

   - Open `MicroControlerCode/Gateway_Testing_2.ino`
   - Update your WiFi credentials:
     ```cpp
     const char* ssid = "YourWiFiName";
     const char* password = "YourWiFiPassword";
     ```
   - Update Firebase credentials:
     ```cpp
     #define FIREBASE_HOST "your-project.firebaseio.com"
     #define FIREBASE_AUTH "your-database-secret"
     ```

5. **Upload Code**:

   - Select `Tools` → `Board` → `NodeMCU 1.0 (ESP-12E Module)`
   - Select the correct COM port
   - Click `Upload` ✓

6. **Verify Operation**:
   - Open Serial Monitor (9600 baud)
   - Should see: ` WiFi Connected`
   - Should see: ` Firebase Connected`
   - Should see: ` LoRa packet received` when nodes transmit

#### Important Notes

**Critical Requirements**:

- LoRa module **MUST** have antenna connected (never operate without antenna!)
- All sensor nodes and gateway must use the same LoRa frequency (433 MHz)
- Serial monitor must be set to **9600 baud** (not 115200)
- Press RESET button on NodeMCU after upload to see output

---

## Software Setup

### Prerequisites

- **Node.js**: Version 18.0 or higher ([Download](https://nodejs.org/))
- **npm**: Comes with Node.js
- **Firebase Account**: Free tier is sufficient ([Sign up](https://firebase.google.com/))
- **Twilio Account** (Optional): For SMS alerts ([Sign up](https://www.twilio.com/try-twilio))

### Installation

1. **Clone the Repository**:

   ```bash
   git clone <repository-url>
   cd Cloud-burst-detection-website/cloudburst-detection
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Configure Firebase**:

   **Option A: Using the existing configuration** (for testing):

   - The project comes with a pre-configured Firebase database
   - Located in `src/lib/firebase.js`
   - Ready to use immediately

   **Option B: Using your own Firebase project** (recommended for production):

   a. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)

   b. Enable **Realtime Database**:

   - Go to `Build` → `Realtime Database`
   - Click `Create Database`
   - Start in **test mode** (for development)

   c. Get your configuration:

   - Go to `Project Settings` → `General`
   - Scroll to "Your apps" → Click web icon `</>`
   - Copy the configuration object

   d. Update `src/lib/firebase.js`:

   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID",
   };
   ```

4. **Firebase Database Structure**:

   Your database will be automatically populated when nodes connect, but the expected structure is:

   ```
   {
     "nodes": {
       "node1": {
         "metadata": {
           "nodeId": "node1",
           "name": "Sensor Station 1",
           "type": "sensor",
           "latitude": 12.3456,
           "longitude": 78.9012,
           "altitude": 850.5,
           "installedBy": "Your Name",
           "description": "Deployment location"
         },
         "realtime": {
           "temperature": 25.7,
           "pressure": 912.0,
           "humidity": 65.3,
           "rssi": -42,
           "lastUpdate": 1697123456000,
           "status": "online"
         },
         "history": {
           "1697123456000": {
             "temperature": 25.7,
             "pressure": 912.0,
             "timestamp": 1697123456000
           }
         }
       }
     },
     "alerts": {
       "alert_id": {
         "message": "Cloudburst detected",
         "severity": "critical",
         "timestamp": 1697123456000,
         "acknowledged": false
       }
     },
     "contacts": {
       "contact_id": {
         "name": "John Doe",
         "phone": "+919876543210",
         "email": "john@example.com"
       }
     }
   }
   ```

5. **Configure Environment Variables** (Optional - for SMS):

   Create a `.env.local` file in the `cloudburst-detection` directory:

   ```env
   # SMS Notification (Optional)
   NEXT_PUBLIC_TWILIO_ENABLED=true
   NEXT_PUBLIC_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   NEXT_PUBLIC_TWILIO_PHONE_NUMBER=+1234567890
   ```

   See [SMS Notification System](#sms-notification-system) section for detailed setup.

6. **Run Development Server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

7. **Verify Installation**:
   - Homepage loads with statistics
   - Dashboard shows map (may be empty if no nodes registered)
   - Console shows: ` Firebase initialized successfully`
   - No errors in browser console

### Building for Production

```bash
npm run build
npm start
```

---

## 📱 SMS Notification System

The system includes an integrated SMS alert system powered by **Twilio** to send instant notifications to registered contacts during critical weather events.

### Quick Overview

- **Purpose**: Send instant SMS alerts to contacts when cloudbursts are detected
- **Provider**: Twilio (industry-standard SMS API)
- **Cost**: ~$0.01 per SMS, free trial includes $15 credit (~1,500 messages)
- **Status**: Optional - system works without SMS (logs notifications only)

### Setup Instructions

#### Step 1: Create Twilio Account

1. Sign up at [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (free trial)
2. Verify your phone number and email
3. Get a free Twilio phone number
4. Note your credentials:
   - Account SID (starts with `AC...`)
   - Auth Token
   - Twilio Phone Number (format: `+1234567890`)

#### Step 2: Install Twilio SDK

```bash
npm install twilio
```

#### Step 3: Configure Environment

Create/update `.env.local`:

```env
NEXT_PUBLIC_TWILIO_ENABLED=true
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
NEXT_PUBLIC_TWILIO_PHONE_NUMBER=+1234567890
```

#### Step 4: Restart Server

```bash
npm run dev
```

#### Step 5: Test SMS

1. **Verify recipient phone number** (for trial accounts):

   - Go to [Twilio Console → Phone Numbers → Verified Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
   - Add your phone number

2. **Create a test alert**:
   - Go to [http://localhost:3000/admin](http://localhost:3000/admin)
   - Add a contact with your verified number
   - Create an alert with "Send SMS" enabled
   - You should receive the SMS immediately

### Features

- **Bulk SMS**: Send to multiple recipients simultaneously
- **Status Tracking**: Monitor delivery success/failure
- **Partial Success Handling**: Continue even if some deliveries fail
- **Error Logging**: Detailed error messages for debugging
- **Firebase Integration**: All SMS events logged to database

### Limitations

**Free Trial Account**:

- Can only send to verified phone numbers
- $15 credit (1,500 SMS)
- SMS cost: ~$0.01 per message

**Paid Account**:

- Send to any valid phone number
- $20 minimum top-up
- No restrictions

### Detailed Documentation

For complete setup instructions, troubleshooting, and API reference, see:

- [SMS_SYSTEM_README.md](SMS_SYSTEM_README.md) - Full SMS documentation
- [SMS_QUICK_START.txt](SMS_QUICK_START.txt) - Quick reference guide

---

## Machine Learning Model

The system uses an **XGBoost** (Extreme Gradient Boosting) machine learning model to predict cloudburst events based on historical weather data and real-time sensor readings.

### Model Overview

- **Algorithm**: XGBoost Classifier
- **Purpose**: Predict cloudburst probability for next 24 hours
- **Training Data**: `cloudburst_cleaned.csv` (historical weather records)
- **Model File**: `cloudburst_xgb_model.pkl` (pre-trained)

### Features Used

The model analyzes 10+ meteorological parameters:

| Feature         | Description               | Unit |
| --------------- | ------------------------- | ---- |
| `minTemp`       | Daily minimum temperature | °C   |
| `maxTemp`       | Daily maximum temperature | °C   |
| `rainfall`      | Precipitation amount      | mm   |
| `windGustSpeed` | Maximum wind gust         | km/h |
| `humidity9am`   | Morning humidity          | %    |
| `humidity3pm`   | Afternoon humidity        | %    |
| `pressure9am`   | Morning pressure          | hPa  |
| `pressure3pm`   | Afternoon pressure        | hPa  |
| `temp9am`       | Morning temperature       | °C   |
| `temp3pm`       | Afternoon temperature     | °C   |

### How It Works

1. **Data Collection**: Sensor nodes send real-time weather data
2. **Feature Engineering**: System calculates daily statistics (min, max, averages)
3. **Prediction**: Model analyzes patterns and outputs cloudburst probability
4. **Alert Trigger**: If probability > threshold, automatic alert is generated

### Prediction API

**Endpoint**: `/api/predict`

**Response**:

```json
{
  "success": true,
  "predictions": [
    {
      "location": "Jaynagar",
      "prediction": 0.85,
      "confidence": 0.92,
      "date": "2025-10-13",
      "severity": "high"
    }
  ]
}
```

### Model Performance

- **Accuracy**: ~85-90% (on test data)
- **Precision**: High for critical events
- **Recall**: Optimized to minimize false negatives (missing actual cloudbursts)

### Retraining the Model

To retrain with new data:

1. Add new records to `cloudburst_cleaned.csv`
2. Run training script (Python required):

   ```python
   # train_model.py (create this)
   import pandas as pd
   import xgboost as xgb
   import pickle

   # Load data
   df = pd.read_csv('cloudburst_cleaned.csv')

   # Train model (add your training code)
   model = xgb.XGBClassifier()
   # ... training logic ...

   # Save model
   pickle.dump(model, open('cloudburst_xgb_model.pkl', 'wb'))
   ```

---

## 📖 Usage Guide

### Dashboard Navigation

After starting the application, you can access:

| Page              | URL           | Description                       |
| ----------------- | ------------- | --------------------------------- |
| **Home**          | `/`           | Live statistics and recent alerts |
| **Dashboard**     | `/dashboard`  | Interactive map with sensor nodes |
| **Prediction**    | `/prediction` | ML-based cloudburst forecasts     |
| **Graphs**        | `/graphs`     | Historical data visualization     |
| **Alerts**        | `/alerts`     | View and manage all alerts        |
| **Admin Panel**   | `/admin`      | Create alerts, manage system      |
| **Contacts**      | `/contacts`   | Manage contact list for SMS       |
| **Register Node** | `/register`   | Register new sensor nodes         |
| **Settings**      | `/settings`   | System preferences                |
| **About**         | `/about`      | Project information               |

### Registering a Sensor Node

1. Navigate to `/register`
2. Fill in node details:
   - **Node ID**: Must match the ID in Arduino code (e.g., `node1`)
   - **Name**: Descriptive name (e.g., "Station Alpha")
   - **Type**: Select `sensor` or `gateway`
   - **Location**: Enter exact GPS coordinates
   - **Altitude**: Elevation in meters
   - **Installed By**: Your name
   - **Description**: Deployment location details
3. Click "Register Node"
4. Verify node appears on dashboard map

### Viewing Real-Time Data

1. Go to `/dashboard`
2. You'll see:
   - **Map**: All registered nodes as markers
   - **Color Coding**:
     - 🟢 Green = Online (updated < 5 min ago)
     - 🟡 Yellow = Warning (updated 5-15 min ago)
     - 🔴 Red = Offline (no update > 15 min)
3. Click any node marker to view:
   - Current sensor readings
   - Node information
   - Last update time
4. Click "View Detailed History" for graphs

### Creating Manual Alerts

1. Go to `/admin` panel
2. Click "Create New Alert"
3. Fill in details:
   - **Message**: Alert text
   - **Severity**: Critical / Warning / Info
   - **Affected Nodes**: Select applicable sensors
   - **Send SMS**: Toggle to send notifications
4. Click "Create & Send Alert"
5. Alert is broadcast immediately

### Managing Contacts

1. Go to `/contacts`
2. Click "Add Contact"
3. Enter:
   - **Name**: Contact name
   - **Phone**: Format `+919876543210` (with country code)
   - **Email**: Optional
   - **Location**: Optional
4. Save contact
5. Contacts automatically receive SMS when alerts are created

### Viewing Predictions

1. Go to `/prediction`
2. View ML model forecasts:
   - Cloudburst probability for next 24 hours
   - Location-based predictions
   - Confidence scores
3. Predictions update every hour

### Analyzing Historical Data

1. Go to `/graphs`
2. Select a node from dropdown
3. Choose time range (24h, 7d, 30d, custom)
4. View interactive charts:
   - Temperature trends
   - Pressure changes
   - Humidity patterns
5. Export data as CSV if needed

### Switching Languages

1. Look for language selector in navigation bar
2. Click to open dropdown
3. Select from:
   - English
   - हिंदी (Hindi)
   - বাংলা (Bengali)
   - ಕನ್ನಡ (Kannada)
   - मराठी (Marathi)
   - தமிழ் (Tamil)
   - తెలుగు (Telugu)
4. Interface updates instantly

### Enabling Dark Mode

- Click the theme toggle button (☀️/🌙) in navigation bar
- System remembers your preference

---

## Deployment

### Deploy to Vercel (Recommended)

Vercel is the recommended platform for deploying Next.js applications.

1. **Push Code to GitHub**:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**:

   - Go to [vercel.com](https://vercel.com/)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js configuration

3. **Configure Environment Variables**:

   - In Vercel dashboard, go to `Settings` → `Environment Variables`
   - Add each variable from your `.env.local`:
     ```
     NEXT_PUBLIC_TWILIO_ENABLED=true
     NEXT_PUBLIC_TWILIO_ACCOUNT_SID=ACxxx...
     TWILIO_AUTH_TOKEN=xxx...
     NEXT_PUBLIC_TWILIO_PHONE_NUMBER=+1xxx...
     ```

4. **Deploy**:

   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your site is live! ✓

5. **Custom Domain** (Optional):
   - Go to `Settings` → `Domains`
   - Add your custom domain
   - Follow DNS configuration instructions

### Deploy to Other Platforms

The application can be deployed to any Node.js hosting platform:

- **Netlify**: Similar to Vercel
- **AWS Amplify**: AWS integration
- **Google Cloud Run**: Container-based
- **Heroku**: Traditional PaaS
- **DigitalOcean**: VPS or App Platform

### Firebase Security Rules

For production, update Firebase Realtime Database rules:

```json
{
  "rules": {
    "nodes": {
      ".read": true,
      ".write": "auth != null"
    },
    "alerts": {
      ".read": true,
      ".write": "auth != null"
    },
    "contacts": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Post-Deployment Checklist

- [ ] Website loads correctly
- [ ] Firebase connection works
- [ ] Real-time data updates
- [ ] SMS notifications work (if configured)
- [ ] All pages accessible
- [ ] Maps load properly
- [ ] No console errors
- [ ] Mobile responsive
- [ ] SSL certificate active (https)

---

## Technology Stack

### Hardware

| Component           | Specification   | Purpose                  |
| ------------------- | --------------- | ------------------------ |
| **Arduino Nano**    | ATmega328P, 5V  | Sensor node controller   |
| **NodeMCU ESP8266** | WiFi enabled    | Gateway controller       |
| **BMP280**          | I2C sensor      | Temperature & pressure   |
| **BME280**          | I2C sensor      | Temp, pressure, humidity |
| **LoRa Ra-02**      | 433 MHz, SX1278 | Long-range radio         |
| **AMS1117**         | 3.3V regulator  | Power management         |

### Software - Frontend

| Technology       | Version | Purpose              |
| ---------------- | ------- | -------------------- |
| **Next.js**      | 15.5.4  | React framework      |
| **React**        | 19.1.0  | UI library           |
| **TailwindCSS**  | 3.4.18  | Styling              |
| **Leaflet**      | 1.9.4   | Interactive maps     |
| **Recharts**     | 3.2.1   | Data visualization   |
| **Lucide React** | 0.544.0 | Icon library         |
| **next-intl**    | 4.3.11  | Internationalization |
| **next-themes**  | 0.4.6   | Dark mode support    |
| **date-fns**     | 4.1.0   | Date formatting      |

### Software - Backend

| Technology             | Purpose                      |
| ---------------------- | ---------------------------- |
| **Firebase**           | Real-time database & hosting |
| **Twilio API**         | SMS notifications            |
| **Next.js API Routes** | Serverless functions         |

### Machine Learning

| Technology       | Purpose                      |
| ---------------- | ---------------------------- |
| **XGBoost**      | Gradient boosting classifier |
| **Python**       | Model training               |
| **Pandas**       | Data processing              |
| **scikit-learn** | ML utilities                 |

### Communication Protocols

| Protocol  | Purpose                       |
| --------- | ----------------------------- |
| **LoRa**  | Long-range radio (433 MHz)    |
| **WiFi**  | Gateway internet connectivity |
| **I2C**   | Sensor communication          |
| **SPI**   | LoRa module interface         |
| **HTTPS** | Secure web access             |

---

## Project Structure

```
Cloud-burst-detection-website/
├── cloudburst-detection/          # Main Next.js application
│   ├── src/
│   │   ├── app/                   # Next.js 15 App Router
│   │   │   ├── page.js            # Homepage
│   │   │   ├── dashboard/         # Live map dashboard
│   │   │   ├── prediction/        # ML predictions
│   │   │   ├── graphs/            # Data visualization
│   │   │   ├── alerts/            # Alert management
│   │   │   ├── admin/             # Admin panel
│   │   │   ├── contacts/          # Contact management
│   │   │   ├── register/          # Node registration
│   │   │   ├── about/             # About page
│   │   │   ├── settings/          # Settings
│   │   │   ├── api/               # API routes
│   │   │   │   ├── predict/       # ML prediction endpoint
│   │   │   │   └── sms/           # SMS notification endpoint
│   │   │   ├── layout.js          # Root layout
│   │   │   └── globals.css        # Global styles
│   │   ├── components/            # React components
│   │   │   ├── Navbar.js          # Navigation bar
│   │   │   ├── Map.js             # Leaflet map
│   │   │   ├── DashboardMap.js    # Dashboard map
│   │   │   ├── DataTable.js       # Data tables
│   │   │   ├── StatsCard.js       # Statistics cards
│   │   │   ├── AlertBanner.js     # Alert notifications
│   │   │   ├── ThemeToggle.js     # Dark mode toggle
│   │   │   ├── LanguageSwitcher.js # Language selector
│   │   │   └── ...                # More components
│   │   ├── lib/                   # Utilities
│   │   │   ├── firebase.js        # Firebase configuration
│   │   │   ├── notifications.js   # SMS system
│   │   │   └── utils.js           # Helper functions
│   │   ├── contexts/              # React contexts
│   │   │   └── ToastContext.js    # Toast notifications
│   │   ├── i18n/                  # Internationalization
│   │   │   ├── config.js          # i18n configuration
│   │   │   └── request.js         # Request handler
│   │   └── utils/                 # Additional utilities
│   │       ├── dataSimulator.js   # Data generation
│   │       └── formatTime.js      # Time formatting
│   ├── messages/                  # Translation files
│   │   ├── en.json                # English
│   │   ├── hi.json                # Hindi
│   │   ├── bn.json                # Bengali
│   │   ├── kn.json                # Kannada
│   │   ├── mr.json                # Marathi
│   │   ├── ta.json                # Tamil
│   │   └── te.json                # Telugu
│   ├── public/                    # Static assets
│   ├── cloudburst_cleaned.csv     # Training data
│   ├── cloudburst_xgb_model.pkl   # ML model
│   ├── package.json               # Dependencies
│   ├── next.config.mjs            # Next.js config
│   ├── tailwind.config.js         # Tailwind config
│   ├── middleware.js              # Next.js middleware
│   ├── SMS_SYSTEM_README.md       # SMS documentation
│   └── README.md                  # This file
├── MicroControlerCode/            # Arduino/ESP8266 code
│   ├── Node-Testing-2.ino         # Sensor node code
│   ├── Gateway_Testing_2.ino      # Gateway code
│   ├── node_Connection.md         # Node wiring guide
│   └── Gateway_Connection.md      # Gateway wiring guide
└── test.py                        # Python test scripts
```

---

## Contributing

We welcome contributions to improve the Cloud-Burst Detection System!

### How to Contribute

1. **Fork the Repository**

   ```bash
   git clone <your-fork-url>
   cd Cloud-burst-detection-website
   ```

2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**

   - Write clean, documented code
   - Follow existing code style
   - Test thoroughly

4. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "Add: Your feature description"
   ```

5. **Push to Your Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to original repository
   - Click "New Pull Request"
   - Describe your changes
   - Reference any related issues

### Code Standards

- **JavaScript/React**: Use ES6+ syntax, functional components with hooks
- **CSS**: Use Tailwind utility classes, avoid custom CSS when possible
- **Comments**: Document complex logic and API integrations
- **Naming**: Use descriptive variable/function names
- **Files**: Keep components modular and single-purpose

### Areas for Contribution

- **Bug Fixes**: Report or fix issues
- **New Features**: Add functionality (discuss first!)
- **Documentation**: Improve README, add tutorials
- **Translations**: Add more languages
- **UI/UX**: Enhance design and user experience
- **Testing**: Add unit/integration tests
- **Performance**: Optimize code and queries

### Reporting Issues

Found a bug? Please report it:

1. Check if issue already exists
2. Create new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment (OS, browser, Node version)

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Cloud-Burst Detection Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgments

### Team

This project was developed as part of the **Smart India Hackathon** initiative to create innovative solutions for disaster management and public safety.

### Technologies

We're grateful to the developers and maintainers of:

- [Next.js](https://nextjs.org/) - The React framework for production
- [Firebase](https://firebase.google.com/) - Backend-as-a-Service platform
- [Leaflet](https://leafletjs.com/) - Open-source mapping library
- [Arduino](https://www.arduino.cc/) - Open-source electronics platform
- [LoRa](https://www.semtech.com/lora) - Long-range radio technology
- [Twilio](https://www.twilio.com/) - Communications API
- [XGBoost](https://xgboost.readthedocs.io/) - Machine learning library
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework

### Resources

- Weather data sourced from historical meteorological records
- Icon library by [Lucide](https://lucide.dev/)
- Sensor specifications from [Adafruit](https://www.adafruit.com/)

---

## System Status

Current Version: **v1.0.0**

| Component         | Status      |
| ----------------- | ----------- |
| Web Dashboard     | Operational |
| Firebase Database | Operational |
| SMS Notifications | Operational |
| ML Predictions    | Operational |
| Hardware Nodes    | Tested      |
| Gateway           | Tested      |

---

## Roadmap

### Future Enhancements

- [ ] **Mobile App**: Native Android/iOS applications
- [ ] **Advanced ML**: Deep learning models (LSTM, GRU)
- [ ] **Weather API Integration**: Supplement with external data
- [ ] **Voice Alerts**: Automated phone calls for critical events
- [ ] **Predictive Evacuation**: Route planning during emergencies
- [ ] **Crowdsourcing**: User-reported weather conditions
- [ ] **Historical Analytics**: Long-term trend analysis
- [ ] **Multi-Region Support**: Deploy across multiple countries
- [ ] **IoT Platform**: Support for additional sensor types
- [ ] **AI Chatbot**: Natural language query interface

---

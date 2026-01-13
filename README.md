# Cloudburst Detection and Early Warning System

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)
![MIT App Inventor](https://img.shields.io/badge/MIT_App_Inventor-Low_Code-orange?logo=mit&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?logo=mysql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)
![Arduino IDE](https://img.shields.io/badge/Arduino_IDE-IoT_Tools-00979D?logo=arduino&logoColor=white)
![NodeMCU](https://img.shields.io/badge/NodeMCU-ESP8266-3C4E73?logo=espressif&logoColor=white)

---

## Overview

The **Cloudburst Detection Website** is part of an integrated IoT + AI solution designed to **predict, detect, and alert communities about potential cloudburst events** in real time.  
It leverages **low-cost, solar-powered IoT sensor nodes** connected via a **LoRa mesh network**, along with **AI/ML-based analytics (XGBoost)** for early cloudburst warnings.

This system provides **hyperlocal weather insights**, **AI-based alerts**, and a **visual dashboard** for monitoring and decision-making — empowering both communities and authorities to respond proactively.

**Live Demo:** [cloudburst-detection-and-early-warn.vercel.app/](https://cloudburst-detection-and-early-warn.vercel.app/)  
**Video Demo:** [Watch on YouTube](https://youtu.be/a9X9CcYgAPU?si=Ea_TAWAwiaaR-COd)

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│               CLOUD-BURST EARLY WARNING & ALARM SYSTEM                       │
│        (Hybrid Stratospheric + Ground + Satellite + AI Architecture)        │
└──────────────────────────────────────────────────────────────────────────────┘


         ┌────────────────────────────────────┐
         │  STRATOSPHERIC BALLOON PAYLOAD    │
         │  STM32 MCU                         │
         │  Sensors:                          │
         │   • BME680 (Temp, Humidity, Press)│
         │   • IR Sensor (CTT)                │
         │   • Tipping Bucket Rain Gauge      │
         │   • GPS                            │
         │  Power: Solar + Battery            │
         │  Storage: Encrypted SD Card        │
         └───────────────┬────────────────────┘
                         │
                         │ LoRa (Payload → Ground)
                         ▼
                ┌─────────────────────┐
                │   GROUND GATEWAY    │
                │   LoRa Receiver     │
                │   GPS               │
                │   Relay + Buzzer    │
                │   SIM GSM Module    │
                └───────────┬─────────┘
                            │
                            │ GSM / Internet
                            ▼
                  ┌───────────────────────┐
                  │     CLOUD PLATFORM    │
                  │  Firebase / Cloud DB  │
                  │  Data Ingestion API   │
                  └───────────┬───────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼

┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ SATELLITE DATA   │   │  ML ENGINE       │   │  ADMIN DASHBOARD │
│ (Macro View)     │──▶│  Hybrid Ensemble │◀──│  Live Monitoring │
│ CTT, TCWV, CAPE  │   │  XGBoost + RF    │   │  Risk Maps       │
└──────────────────┘   └─────────┬────────┘   └──────────────────┘
                                  │
                                  │ Prediction Output
                                  ▼
                       ┌────────────────────────┐
                       │     ALERT SYSTEM       │
                       │  Threshold + AI Based  │
                       │  Yellow / Orange / Red │
                       └───────────┬────────────┘
                                   │
             ┌─────────────────────┼────────────────────┐
             ▼                     ▼                    ▼

      ┌──────────────┐      ┌──────────────┐     ┌──────────────┐
      │  SMS Alerts  │      │ Local Siren  │     │ Authorities  │
      │ (GSM Push)   │      │ + Relay      │     │ Dashboard    │
      └──────────────┘      └──────────────┘     └──────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │     END USERS & COMMUNITY│
                    │  Citizens & Disaster Mgmt│
                    └──────────────────────────┘

```

---

## Project Architecture

### 1. **IoT Hardware Layer**

- **Node MCU (ESP32/ESP8266)** equipped with:
  - BME280 (Temperature, Humidity, Pressure)
  - Rain Sensor
  - Wind Speed Sensor
- **LoRa-based mesh** for peer-to-peer communication
- **Solar-powered**, battery-backed for remote areas
- **Autonomous operation** without telecom dependency

### 2. **Gateway Layer**

- **Arduino Nano/ESP32 Gateway** that collects data from nodes
- Relays data via Wi-Fi or LoRa to the web dashboard and cloud

### 3. **Cloud & AI Layer**

- **XGBoost-based model** analyzes live + historical weather data
- Detects anomalies and predicts potential cloudbursts
- Generates three types of alerts:
  | Alert Type | Trigger | Response Time |
  |-------------|----------|----------------|
  | Threshold Alert | Sensor readings cross safe limits | ~10 mins |
  | AI-based Alert | ML model predicts anomaly | ~4 hrs in advance |
  | Custom Alert | Admin manual override | Immediate |

### 4. **Web Application**

- Built with **Next.js + Firebase**
- Displays **real-time weather parameters**
- Visualizes **alert levels, confidence, and safety instructions**
- Provides **admin control** for sending custom alerts
- Integrated **SMS and Sirens** for communities

---

## Tech Stack

| Layer    | Technology                      |
| -------- | ------------------------------- |
| Sensors  | BME280, Rain Gauge, Wind Sensor |
| MCU      | Arduino Nano / ESP32            |
| Network  | LoRa                            |
| Backend  | Firebase / Cloud DB             |
| ML       | Python, XGBoost, scikit-learn   |
| Frontend | Next.js                         |
| Alerts   | SMS Gateway, Siren, Dashboard   |

---

## Key Features

- Real-time **sensor data visualization**
- **AI-powered** anomaly detection using XGBoost
- Multi-level **alert system** (Threshold / AI / Manual)
- **SMS, Siren, and App notifications** for end-users
- **Decentralized LoRa Mesh** for connectivity in remote terrain
- **Solar-powered** low-cost hardware (~₹2.5K–3K per node)
- **Live dashboard** with intuitive UI
- **High reliability:** 99% uptime in field tests
- **Community-friendly deployment** model

---

## Results and Impact

- **95%+ precision** in cloudburst prediction during trials
- **Instant alerts** via SMS and mobile notifications
- **Designed for hilly and rural terrains** with no network dependency
- **10x cheaper** than existing commercial weather stations
- **1,500,000+ lives protected** (projected reach)
- **₹200+ Cr annual savings** via early evacuation and damage prevention
- Aligned with **UN SDGs 3, 9, 11, and 13**

---

## Project Setup (Local)

### Prerequisites

- Next.js 
- npm or yarn
- Firebase account

### Environment Variables

Create a **`.env.local`** file in the root of your project and add the following environment variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_key
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_key
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_key
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_key
NEXT_PUBLIC_FIREBASE_LEGACY_TOKEN=your_key

# ThingSpeak Configuration
NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID=your_key
NEXT_PUBLIC_THINGSPEAK_READ_API_KEY=your_key

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Steps

1. Clone the repository

```bash
git clone https://github.com/AbhinavPamadi/Cloudburst-Detection-and-Early-Warning-System
```

2. Navigate into the project directory

```bash
cd cloudburst-detection
```

3. Install dependencies

```bash
npm install
```

4. Run the development server

```bash
npm run dev
```

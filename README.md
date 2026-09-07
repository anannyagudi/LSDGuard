# 🐄 LSDGuard – AI-Powered Lumpy Skin Disease Detection System

LSDGuard is an **AI-powered livestock healthcare platform** designed to assist farmers and veterinary professionals in the early detection and management of **Lumpy Skin Disease (LSD)** in cattle.

The system uses **Deep Learning and Computer Vision** to analyze cattle images and provide an AI-based disease risk assessment. Along with disease detection, LSDGuard provides cattle health management, vaccination tracking, scan history, and automated report generation.

---

## 🚀 Key Features

### 🤖 AI-Based Disease Detection

* Upload multiple images of cattle from different body angles.
* AI analyzes the uploaded images for signs associated with Lumpy Skin Disease.
* Provides a **disease risk percentage and severity level**.
* Helps with preliminary screening and early identification.

### 🐄 Cattle Management

* Register and manage individual cattle.
* Maintain cattle profiles including:

  * Name/ID
  * Age
  * Breed
  * Gender
  * Health status
* Maintain digital health records.

### 💉 Vaccination Tracking

* Record vaccination history.
* Track upcoming and completed vaccinations.
* Receive reminders for scheduled vaccinations.

### 📊 Scan History

* Store previous AI disease scans.
* View historical predictions and severity levels.
* Monitor cattle health over time.

### 📄 Automated Reports

* Generate detailed PDF reports for individual scans.
* Reports include:

  * Scan details
  * AI prediction
  * Confidence/risk score
  * Severity level
  * Relevant health information

### 🌐 Multilingual & User-Friendly Interface

* Simple and intuitive interface designed for farmers.
* Supports multilingual interaction.
* Mobile-friendly design for convenient field usage.

---

## 🏗️ System Architecture

```text
                 ┌──────────────────────┐
                 │      User/Farmer     │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   React Frontend     │
                 │      Web / Mobile    │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Node.js + Express    │
                 │      Backend API     │
                 └───────┬───────┬──────┘
                         │       │
              ┌──────────┘       └────────────┐
              ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐
     │    MongoDB      │             │  FastAPI ML     │
     │ Database        │             │    Service      │
     └─────────────────┘             └────────┬────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │ PyTorch /       │
                                    │ Deep Learning   │
                                    │ Model           │
                                    └─────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* JavaScript
* CSS
* React Native + Expo *(mobile application)*

### Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* Multer

### Machine Learning

* Python
* FastAPI
* PyTorch
* YOLO-based computer vision
* Image preprocessing and validation

### Database

* MongoDB
* Mongoose

### Other Tools

* Git & GitHub
* Postman
* VS Code
* PDF generation libraries
* Firebase Authentication

---

## 📂 Project Structure

```text
LSDGuard/
│
├── Frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── Backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── Middleware/
│   ├── Inference/
│   ├── YOLO/
│   ├── package.json
│   └── ...
│
├── .gitignore
├── README.md
└── ...
```

> **Note:** The training dataset is intentionally excluded from this repository because of its large size.

---

## ⚙️ How It Works

### 1. User Registration

The user creates an account and provides basic profile information.

### 2. Cattle Registration

The user registers cattle and maintains their individual health profiles.

### 3. Image Upload

The user uploads **2–5 images** of the cattle from different body angles.

### 4. Image Validation

The system verifies whether the uploaded images are relevant cattle images and processes them for analysis.

### 5. AI Analysis

The images are sent from the Node.js backend to the Python/FastAPI machine learning service.

The deep learning model analyzes the images and identifies visual patterns associated with Lumpy Skin Disease.

### 6. Risk Assessment

The system generates:

* Disease risk score
* Prediction
* Severity level
* Diagnostic insights

### 7. Health Record

The scan result is stored in MongoDB and becomes part of the cattle's health history.

### 8. Report Generation

The user can generate and download a PDF report containing the scan results.

---

## 🔄 AI Detection Pipeline

```text
Cattle Images
      │
      ▼
Image Upload
      │
      ▼
Image Validation
      │
      ▼
Preprocessing
      │
      ▼
Deep Learning Model
      │
      ▼
Disease Detection
      │
      ▼
Confidence / Risk Calculation
      │
      ▼
Severity Classification
      │
      ▼
Result Stored in MongoDB
      │
      ▼
User Dashboard + PDF Report
```

---

## 🔐 Security

LSDGuard incorporates several security mechanisms:

* JWT-based authentication
* Password hashing using bcrypt
* Role-based access control
* Protected backend routes
* Input validation
* Secure API communication
* Helmet-based HTTP security headers
* User-specific cattle and scan data access

---

## 📊 Main Modules

| Module               | Description                                |
| -------------------- | ------------------------------------------ |
| Authentication       | User registration, login and authorization |
| Cattle Management    | Register and manage cattle profiles        |
| AI Disease Detection | Analyze cattle images for LSD risk         |
| Scan History         | Store and review previous scans            |
| Health Records       | Maintain digital cattle health information |
| Vaccination Tracking | Manage vaccination schedules               |
| Notifications        | Provide vaccination and health reminders   |
| PDF Reports          | Generate downloadable diagnostic reports   |
| Multilingual Support | Improve accessibility for different users  |

---

## 🎯 Objectives

* Enable **early detection** of Lumpy Skin Disease.
* Provide quick AI-assisted preliminary screening.
* Simplify cattle health record management.
* Digitize vaccination tracking.
* Provide historical scan information.
* Generate automated health reports.
* Improve accessibility for farmers.
* Reduce delays caused by limited veterinary access.
* Provide a scalable foundation for future livestock disease detection.

---

## 🔮 Future Scope

LSDGuard can be further enhanced with:

* **Multi-disease detection** for additional livestock diseases.
* Larger and more diverse datasets for improved model accuracy.
* Dedicated Android/iOS mobile application.
* Offline mode with automatic synchronization.
* Real-time disease outbreak monitoring.
* Integration with veterinary consultation services.
* Voice-based interaction for farmers.
* Expanded regional language support.
* IoT-based cattle monitoring using temperature and activity sensors.
* Cloud-based analytics and herd-level monitoring.

---

## ⚠️ Disclaimer

LSDGuard is intended to provide **AI-assisted preliminary disease screening and livestock health management support**. Its predictions should not be considered a replacement for professional veterinary diagnosis or treatment.

---

## 👩‍💻 Project

**Project Name:** LSDGuard
**Domain:** Artificial Intelligence / Machine Learning / Agriculture & Livestock Healthcare
**Application:** Lumpy Skin Disease Detection and Cattle Health Management
**Development Approach:** Agile

---

## ⭐ Contribution

Contributions, suggestions, and improvements are welcome. If you would like to contribute, feel free to fork the repository, create a new branch, and submit a pull request.

---

## 📜 License

This project is developed for **academic and educational purposes**.

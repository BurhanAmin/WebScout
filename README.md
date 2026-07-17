# WebScout

> Zero-configuration observability for web applications.

WebScout is a developer tool that sits in front of your application as a reverse proxy, automatically capturing request metrics, browser errors, performance data, and regressions—without requiring any changes to your application's source code.

Instead of installing SDKs or adding middleware, simply run your application through WebScout and start monitoring immediately.

---

## Features

* **Zero Code Changes** – No middleware, SDKs, or application modifications required.
* **Automatic Request Monitoring** – Capture HTTP methods, routes, status codes, response times, and request durations.
* **Browser Error Tracking** – Automatically injects a lightweight client-side interceptor into HTML responses to capture JavaScript, Fetch, and XHR errors.
* **Local Metrics Database** – Stores all metrics in a local SQLite database inside a `.webscout/` folder.
* **Regression Detection** – Detects endpoints whose performance has degraded over time.
* **Git Commit Blame** – Identifies commits that may have introduced regressions using the project's Git history.
* **Lighthouse Audits** – Run Lighthouse audits directly from the CLI.
* **Live Terminal Dashboard** – Monitor requests, latency, and errors in real time from your terminal.

---

# How It Works

Normally, your application runs like this:

```text
Browser
    │
    ▼
Your App
```

With WebScout:

```text
Browser
    │
    ▼
WebScout Proxy
    │
    ▼
Your App
```

Every request passes through WebScout before reaching your application.

This allows WebScout to automatically:

* Measure request latency
* Record HTTP status codes
* Capture request timings
* Detect failed requests
* Monitor browser-side errors
* Store metrics locally

Your application continues running exactly as before.

---

# Architecture

```text
                Browser
                    │
                    ▼
        ┌────────────────────┐
        │    WebScout CLI    │
        │ Reverse Proxy      │
        └─────────┬──────────┘
                  │
      Logs Requests & Responses
                  │
                  ▼
           Your Web Application
                  │
                  ▼
          SQLite (.webscout/)
                  │
                  ▼
        Dashboard / Reports / AI
```

---

# Installation

Once published:

```bash
npm install -g webscout
```

During development:

```bash
npm link
```

---

# Quick Start

Run your application through WebScout.

```bash
webscout run "npm run dev"
```

Instead of connecting directly to your application, your browser connects to the WebScout proxy.

The proxy forwards every request while collecting metrics in the background.

---

# Example

```bash
webscout run "npm start"
```

Your application:

```text
localhost:3001
```

WebScout Proxy:

```text
localhost:3000
```

Open your browser as usual:

```text
http://localhost:3000
```

Your application behaves exactly the same while WebScout records metrics behind the scenes.

---

# Commands

### Start Monitoring

```bash
webscout run "npm run dev"
```

Starts your application behind the WebScout reverse proxy.

---

### Dashboard

```bash
webscout dashboard
```

Launches a live dashboard showing:

* Active requests
* Average latency
* Error rate
* Slow endpoints
* Recent requests

---

### Lighthouse Audit

```bash
webscout audit
```

Runs a Lighthouse audit against the proxied application and stores the results locally.

---

### Regression Report

```bash
webscout regressions
```

Compares historical request metrics to identify endpoints with degraded performance.

---

### Commit Blame

```bash
webscout blame
```

Uses the local Git repository to identify commits that may have introduced performance regressions or failures.

---

# Metrics Collected

## Server

* HTTP Method
* Route
* Status Code
* Response Time
* Request Duration
* Timestamp

## Browser

* JavaScript Errors
* Fetch Failures
* XHR Failures
* Page Load Metrics
* Navigation Timing

## Performance

* Average Latency
* Error Rate
* Slowest Endpoints
* Request Frequency
* Lighthouse Scores

---

# Local Storage

All collected data is stored locally.

```text
.webscout/
    metrics.db
```

No external database is required.

No cloud account is required.

No additional setup is required.

---

# Why WebScout?

Traditional observability platforms often require:

* Installing SDKs
* Adding middleware
* Modifying application code
* Setting up databases
* Configuring cloud services

WebScout removes those barriers by acting as a transparent reverse proxy.

Simply run your application through WebScout and begin collecting observability data immediately.

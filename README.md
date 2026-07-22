<div align="center">

# 🚀 WebScout

### Terminal-first Web Performance & Regression Detection

*Monitor performance. Detect regressions. Blame the commit.*

![Node.js](https://img.shields.io/badge/Node.js-24+-339933?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Built--in-blue?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/macOS-Linux-Windows-orange)

</div>

---

## ✨ Overview

WebScout wraps your application the same way **Git wraps your repository**.

Instead of modifying your codebase, simply run your application **through WebScout**.

It automatically:

- 📊 Records every API request
- ⚡ Measures real browser performance
- 🔍 Runs Lighthouse audits
- 📈 Detects regressions across commits
- 🧠 Identifies the commit most likely responsible

No SDKs.
No code changes.
No external database.

Everything stays local.

---

# 🎯 Why WebScout?

Most performance bugs don't fail builds.

Instead they quietly ship into production.

- An endpoint becomes 30% slower
- A JavaScript bundle grows by 500KB
- A new API starts returning errors
- Lighthouse score slowly drops

Nobody notices...

...until users do.

WebScout continuously records performance metrics tagged with Git commits and automatically tells you:

> **"This endpoint became 42% slower after commit `9f84c1a`."**

---

# ✨ Features

| Feature | Description |
|----------|-------------|
| 🔄 Reverse Proxy | Transparently sits in front of your application |
| 📊 API Monitoring | Logs every request, status code and latency |
| 🌐 Real User Monitoring | Injects browser script automatically |
| 🚨 Fetch Error Detection | Captures failed fetch/XHR requests |
| 💡 Lighthouse Integration | Stores Core Web Vitals for every audit |
| 📈 Regression Detection | Compares latest metrics with historical baseline |
| 🧠 Commit Blame | Shows commits responsible for regressions |
| 💾 SQLite Storage | Everything stored locally in `.wpd/metrics.db` |
| 🛠 Zero Instrumentation | No code changes required |

---

# 🏗 Architecture

```text
                 Browser
                    │
                    ▼
        ┌───────────────────────┐
        │     WebScout Proxy    │
        │        :5050          │
        └──────────┬────────────┘
                   │
     Logs Requests │
 Injects RUM Script│
                   ▼
           Your App (:4000)

                   │
                   ▼
        .wpd/metrics.db (SQLite)
                   ▲
                   │
      Browser RUM Collector

      wpd audit  ───► Lighthouse
      wpd check  ───► Regression Engine
      wpd blame  ───► Git History
```

Every collected metric is tagged with the current Git commit hash.

---

# 📦 Requirements

| Requirement | Version |
|------------|---------|
| Node.js | **24+** |
| Git | Installed |
| Chromium Browser | Chrome / Brave / Edge / Chromium |

Lighthouse requires a Chromium browser.

If WebScout cannot detect one automatically:

```bash
export CHROME_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
```

---

# ⚙ Installation

```bash
npm install -g @your-npm-username/webscout
```

Verify installation:

```bash
wpd --help
```

---

# 🚀 Quick Start

### 1. Start monitoring

```bash
wpd run "npm start"
```

Visit

```
http://localhost:5050
```

instead of your application's port.

---

### 2. Browse normally

Use your application as you normally would.

WebScout automatically collects:

- Request latency
- Status codes
- Browser timings
- Failed fetches

---

### 3. View metrics

```bash
wpd stats
```

Example:

```
API Metrics

GET /api/users
Average: 38ms

POST /login
Average: 112ms

Browser Metrics

FCP
1.2s

Load Time
2.4s

Fetch Errors
0
```

---

### 4. Run Lighthouse

```bash
wpd audit http://localhost:4000
```

Stored metrics include:

- Performance Score
- FCP
- LCP
- TTI
- Page Weight

---

### 5. Detect regressions

```bash
wpd check
```

Example output

```
✓ Baseline established

⚠ Regression detected

Endpoint:
/api/report

Latency:
+198%

Commit:
9f84c1a
```

---

### 6. Find the responsible commit

```bash
wpd blame
```

Example

```
Regression:
Latency on /api/report

Likely Cause

Commit:
9f84c1a

Files Changed

src/report.js
src/cache.js
```

---

# 🧪 Example Workflow

### Baseline

```bash
wpd run "npm start"
```

Generate some traffic.

---

### Introduce a regression

```bash
git commit -am "Slow report endpoint"
```

---

### Generate traffic again

Restart WebScout.

Use the endpoint again.

---

### Detect it

```bash
wpd check
```

Output

```
Latency regression

/api/report

+199%

Commit:
9f84c1a
```

---

### Blame it

```bash
wpd blame
```

Output

```
Likely responsible commit

9f84c1a

Modified files

src/report.js
```

---

# ⚙ Configuration

Located in

```
src/regressionDetector.js
```

| Setting | Default |
|----------|----------|
| LATENCY_THRESHOLD | 20% |
| WEIGHT_THRESHOLD | 20% |
| BASELINE_WINDOW | 5 builds |

---

# 📁 Project Structure

```text
wpd-cli
│
├── bin
│   └── wpd.js
│
├── src
│   ├── proxy.js
│   ├── injector.js
│   ├── db.js
│   ├── lighthouseRunner.js
│   ├── regressionDetector.js
│   └── commitBlame.js
│
├── assets
│   └── rum.js
│
└── .wpd
    └── metrics.db
```

---

# 🗄 Database

| Table | Purpose |
|---------|---------|
| `api_metrics` | Every proxied request |
| `client_events` | Browser performance & fetch failures |
| `build_metrics` | Lighthouse audit results |
| `regressions` | Regression history |

---

# ⚠ Limitations

- Designed for **local development**
- Proxy buffers HTML responses for RUM injection
- Commit blame depends on how frequently metrics are collected
- Production monitoring would require a hosted collector

---

# 🛠 Tech Stack

- Node.js 24+
- Built-in `node:sqlite`
- http-proxy
- Commander.js
- Lighthouse
- Git

---

# 🛣 Roadmap

- [ ] GitHub Actions integration
- [ ] HTML performance reports
- [ ] Live terminal dashboard
- [ ] Flamegraph generation
- [ ] Docker support
- [ ] Production collector
- [ ] Slack / Discord notifications
- [ ] Performance trend graphs

---

# 📄 License

MIT

---

<div align="center">

**WebScout makes performance regressions impossible to ignore.**

</div>
# Autonomous Research Agent - Assessment Submission

An autonomous AI agent designed to perceive its environment, formulate target search strategies, search multiple external websites/APIs, filter and deduplicate content, and generate complete, highly structured reports with actionable insights and citations.

This solution satisfies **Assessment Option 1: Autonomous Research Agent** for the **AI Automation Engineer** opportunity at **Xiarch Solutions Pvt. Ltd.**

---

## 🚀 Key Features

1. **Autonomous Search Strategy Planning**: The agent uses an LLM (Gemini 2.5) to analyze the user's research topic and dynamically generate optimized, diverse search queries for comprehensive coverage.
2. **Google Search Grounding**: Leverages real-time Google Search Grounding to extract live web information, ensuring the report is factual, up-to-date, and free of hallucinations.
3. **Automatic Deduplication & Citation Parsing**: Extracts the exact sources used, parsing domains and snippets, and automatically compiling them into a neat references list.
4. **URL Direct Scraping (Bonus)**: Allows users to input specific external source URLs. The server will fetch and scrape the clean text from these pages, feeding it as grounded context into the agent alongside standard search results.
5. **Interactive Logs Dashboard**: A detailed timeline displaying the step-by-step progress of the agent (Analyzing -> Formulating Queries -> Scraping -> Deduplicating -> Synthesizing -> Complete).
6. **Multi-format Exports**: Export reports directly to beautifully styled **Markdown** files, or export cleanly formatted **PDF layouts** using the integrated print system (tailored with high-contrast print media queries).
7. **Local Storage Memory / History**: Saves previous research sessions automatically to the client side.
8. **Pre-populated Showcases**: Features two highly detailed prepopulated research datasets (Solid State Batteries & Post Quantum Cryptography) to demonstrate the agent's outstanding structural outputs instantly, without requiring API calls.

---

## 🛠️ Project Structure

* `/server.ts` - Express backend server providing autonomous research planners, specific URL scraping, and Gemini API integration.
* `/src/App.tsx` - Interactive, elegant single-screen workspace React interface in a high-contrast Slate/Emerald design.
* `/src/prepopulated.ts` - Deep-tech pre-populated mock dataset for zero-configuration assessment demonstration.
* `/src/index.css` - Custom styling theme, custom markdown elements, and high-fidelity printing rules for PDF exports.
* `/package.json` - Custom build configurations to bundle Vite and tsx for Node.js production container deployment.

---

## 💻 Installation & Setup

Follow these simple steps to run the application locally:

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **yarn**
* **Gemini API Key** (Get a free key from Google AI Studio)

### Step 1: Install Dependencies
In the root directory, run:
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

### Step 3: Run the Development Server
Launch both the backend and client dev process:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📦 Production Build & Deployment

To prepare a production-ready package or container build:

```bash
# 1. Build client and compile typescript server
npm run build

# 2. Run the production server
npm start
```

---

*Submitted by: shashwatmitrab@gmail.com*

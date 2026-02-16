# HyperSpace Cadet: The Sentient Pinball Experience

> **Challenge Submission: Gaming & Interactive Entertainment Vertical**

![Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 🚀 Overview

**HyperSpace Cadet** reimagines the classic "3D Pinball for Windows" for the AI era. It is not just a game; it is a **dynamic, conversational experience** where the game itself watches you play, reacts to your performance, and generates unique missions on the fly.

Powered by **Google Gemini 2.0 Flash (Live API)** and **Gemini 1.5 Flash**, this project demonstrates how multimodal AI can transform static gameplay into an immersive, narrative-driven adventure. You aren't just hitting a ball; you are a recruit piloting a drone, receiving orders from a grumpy, high-energy AI "Admiral" who cheers your successes and berates your failures in real-time.

---

## 🧠 Smart Assistant & Dynamics

This solution integrates a "Smart Assistant" directly into the core game loop, fulfilling the challenge requirement for a **dynamic assistant** that understands context.

### The "Admiral" Persona
The AI assumes the role of a Starfleet Admiral. It:
- **Watches** game events (bumper hits, ramp shots, ball drains).
- **Reacts** instantly with voice commentary (using Gemini Live API's low-latency audio streaming).
- **Adapts** its tone based on your performance (encouraging for combos, harsh for failures).

### Dynamic Mission Generation
Instead of hard-coded objectives, the game uses **Gemini 1.5 Flash** to generate missions based on your current score and rank.
- **Context-Aware**: If you are a "Cadet" with a low score, the mission might be "Scrub the Decks". If you are an "Admiral" with a high score, it might be "Save the Galaxy".
- **Unique Content**: Every mission has a unique name, description, and objective text, ensuring no two games are exactly alike.

---

## 🛠 Technology Stack & Architecture

### Google Services
- **Gemini 2.0 Flash (Live API)**: Used for the real-time, low-latency "Admiral" voice commentary. It receives text events from the game and streams back audio.
- **Gemini 1.5 Flash**: Used for text generation to create mission names, descriptions, and rank titles based on game state.
- **Google GenAI SDK**: The official Node/Web SDK is used to interface with the models.

### Frontend Core
- **React**: Manages the UI, game state, and component lifecycle.
- **React Three Fiber (R3F) & Three.js**: Renders the 3D pinball table, lights, and effects.
- **Rapier Physics**: Handles the realistic physics simulation for the ball and flippers.
- **Web Audio API**: Decodes and plays the raw PCM audio chunks received from the Gemini Live API.
- **Tailwind CSS**: Provides a sleek, futuristic, glassmorphism-inspired UI.

### Logic Flow
1.  **Game Loop**: The physics engine detects collisions (e.g., ball hits bumper).
2.  **Event Dispatch**: The game dispatches an event (e.g., `BUMPER_HIT`) to the `AdmiralLiveConnection` service.
3.  **AI Processing**:
    - The service sends a text prompt to the open Gemini Live session.
    - Gemini generates a short, character-driven response (audio).
4.  **Feedback**: The audio is streamed back, decoded, and played to the user immediately.
5.  **Mission Triggers**: periodically, the game state requests a new mission from Gemini 1.5 Flash, updating the UI with new text.

---

## 🔧 Setup & Installation

### Prerequisites
- Node.js (v18+)
- A Google Cloud Project with Gemini API access
- A Gemini API Key

### Steps
1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd Google-Prompt-Wars-Prem
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env.local` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` (or the port shown in your terminal).

---

## 🎯 Evaluation Criteria Highlights

- **Code Quality**: Modular architecture separating Game Logic (`GameCanvas`), AI Services (`geminiService`), and UI (`ControlPanel`). strongly typed with TypeScript.
- **Effective Use of Google Services**: Leverages the *latest* Gemini capabilities (Live API for audio, Flash for speed).
- **Usability**: Simple "one-click" start. The game handles the connection and audio context automatically.
- **Innovation**: Moves beyond "chatbot" interfaces to "ambient computing" where the AI is an observer and commentator.

---

## ⚠️ Assumptions & Notes

- **Browser Support**: Requires a modern browser with Web Audio API and WebGL support (Chrome/Edge recommended).
- **API Quotas**: Real-time audio streaming can consume tokens quickly. Ensure your quota allows for high-throughput usage if playing for extended periods.
- **Network**: A stable, low-latency internet connection is recommended for the best "Live" experience.

---
*Built for the Google Prompt Wars Challenge 2026*

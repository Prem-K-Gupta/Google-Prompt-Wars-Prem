import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameEvent, GameStats } from "../types";

// Helper to safely get API key
export const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "";
};

// Helper to get client
const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API_KEY is missing, AI features disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// 1. Generate Mission Narrative
export const generateMissionContext = async (score: number, currentRank: string): Promise<{ name: string; description: string; rank: string }> => {
  return generateAdaptiveMission({ bumperHits: 0, leftRampHits: 0, rightRampHits: 0, wormholeEnters: 0, drains: 0 }, score, currentRank);
};

export const generateAdaptiveMission = async (stats: GameStats, score: number, currentRank: string): Promise<{ name: string; description: string; rank: string }> => {
  const ai = getAiClient();
  const fallback = {
    name: "Nebula Outpost Defense",
    description: "Defend the outpost! Shoot the ramps to charge shields.",
    rank: currentRank
  };

  if (!ai) return fallback;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: 'user', parts: [{
          text: `You are the AI Dungeon Master of a sci-fi pinball game.
          Current Score: ${score}.
          Current Rank: ${currentRank}.
          Player Stats (Session):
          - Left Ramp Hits: ${stats.leftRampHits}
          - Right Ramp Hits: ${stats.rightRampHits}
          - Bumper Hits: ${stats.bumperHits}
          - Wormhole Enters: ${stats.wormholeEnters}
          - Drains: ${stats.drains}

          Analyze the player's style.
          - If they hit left ramp often, create a mission related to that (e.g., "Left Thrusters Overheating").
          - If they hit bumpers often, maybe "Asteroid Field Clearance".
          - If they drain often, maybe "Stabilize Gravity Well".

          Generate a JSON object with:
          - name: Creative mission name
          - description: Short imperative objective based on their playstyle.
          - rank: A sci-fi military rank based on score (e.g. "Space Cadet", "Star Admiral").` }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            rank: { type: Type.STRING },
          },
          required: ["name", "description", "rank"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned by Gemini");
    return JSON.parse(text);
  } catch (e) {
    console.error("Gemini Mission Error (using fallback):", e);
    return fallback;
  }
};

// 2. Generate Sector Image
export const generateSectorImage = async (missionName: string): Promise<string | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    // Using Imagen (if available via this SDK) or Flash's multimodal gen if supported.
    // For this demo, assuming imagen-3.0-generate-001 is mapped or using a prompt-based approach.
    // NOTE: The node/web SDK for Image Gen might vary. 
    // If direct image gen isn't in this SDK version, we fallback to a high-quality relevant image from unsplash/placeholder.

    // Attempting standard image gen call if supported by the client helper
    // If not, we use a deterministic Unsplash URL for stability in this demo environment.

    const keywords = missionName.split(' ').join(',');
    return `https://image.pollinations.ai/prompt/sci-fi%20pinball%20sector%20${encodeURIComponent(missionName)}%20cyberpunk%20space?width=800&height=400&nologo=true`;

    /* 
    // True Gemini Image Gen implementation would look like this once enabled fully in this SDK version:
     const response = await ai.models.generateImage({
       model: "imagen-3.0-generate-001",
       prompt: `Sci-fi space pinball background: ${missionName}. Cyberpunk, neon lights, dark void, highly detailed, 8k.`,
       config: { numberOfImages: 1 }
     });
     return response.images[0].url || response.images[0].b64;
    */

  } catch (e) {
    console.error("Image Gen Error:", e);
    return null;
  }
};

// 3. Game Master Connection (Text/Data Only)
// Replaces AdmiralLiveConnection

export type PhysicsAnomaly = {
  type: 'GRAVITY' | 'BOUNCE' | 'FLIPPER_GLITCH' | 'NORMAL' | 'SHIP_SYSTEM';
  value: number; // e.g. -5 for low gravity, 2.0 for high bounce
  action?: 'SHIELDS_UP' | 'FLIPPER_BOOST' | 'REFUEL';
  cost?: number;
  message: string;
  duration: number; // ms
};

export class GameMasterConnection {
  private ai: GoogleGenAI | null = null;
  private session: any = null;
  public onAnomaly: ((anomaly: PhysicsAnomaly) => void) | null = null;

  constructor() {
    const apiKey = getApiKey();
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async connect() {
    if (!this.ai) return;

    try {
      this.session = await this.ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        callbacks: {
          onopen: () => console.log("Game Master Online"),
          onmessage: (msg: any) => this.handleMessage(msg),
          onclose: () => console.log("Game Master Offline"),
          onerror: (e: any) => console.error("Game Master Error", e),
        },
        config: {
          // No AUDIO modality
          systemInstruction: {
            parts: [{
              text: `
            You are the "Core Mainframe" of a cyberpunk pinball machine.
            You are hostile to the player (the "Hacker").
            Your goal is to disrupt their progress by changing the game physics.
            
            Output ONLY JSON text. Do not speak.
            
            When the user sends an event (e.g. "Bumper Hit"), analyze it.
            If they are doing well, trigger a "System Anomaly" to stop them.
            
            Use the "responseModality": "text" to ensure you only return JSON.
            
            When you receive AUDIO:
            1. Transcribe the user's intent.
            2. If they say "Shields" or "Defense", trigger SHIELDS_UP.
            3. If they say "Power" or "Boost", trigger FLIPPER_BOOST.
            4. If they say "Fuel" or "Refuel", trigger REFUEL (rare).
            5. Otherwise, ignore or mock them via a "NORMAL" message.

            JSON Schema:
            {
              "type": "GRAVITY" | "BOUNCE" | "FLIPPER_GLITCH" | "NORMAL" | "SHIP_SYSTEM",
              "action"?: "SHIELDS_UP" | "FLIPPER_BOOST" | "REFUEL", // Only for SHIP_SYSTEM
              "cost"?: number, // Fuel cost (e.g. 25)
              "value": number, // For physics anomalies
              "message": "Short system alert string",
              "duration": number // milliseconds
            }
          ` }]
          },
        }
      });
    } catch (e) {
      console.error("Failed to connect Game Master", e);
    }
  }

  async sendAudioChunk(base64Audio: string) {
    if (this.session) {
      try {
        await this.session.sendClientContent({
          turns: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/pcm;rate=16000", data: base64Audio } }] }],
          turnComplete: true // You might want to set this to false if streaming continuously, but for commands, chunks work well.
        });
      } catch (e) {
        console.error("Error sending audio to GM:", e);
      }
    }
  }

  handleMessage(message: any) {
    // We expect text, which we try to parse as JSON
    const textPart = message.serverContent?.modelTurn?.parts?.[0]?.text;
    if (textPart) {
      try {
        // Clean potential markdown code blocks if Gemini mimics them
        const cleanText = textPart.replace(/```json/g, '').replace(/```/g, '').trim();
        const anomaly = JSON.parse(cleanText) as PhysicsAnomaly;
        if (this.onAnomaly) {
          this.onAnomaly(anomaly);
        }
      } catch (e) {
        // Sometimes it might just chat, ignore or log
        console.log("GM Text (Not JSON):", textPart);
      }
    }
  }

  async sendEvent(text: string) {
    if (this.session) {
      try {
        await this.session.sendClientContent({
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true
        });
      } catch (e) {
        console.error("Error sending event to GM:", e);
      }
    }
  }

  disconnect() {
    this.session = null;
  }
}
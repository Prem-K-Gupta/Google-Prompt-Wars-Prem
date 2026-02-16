import { GoogleGenAI, Modality, Type, SchemaType } from "@google/genai";
import { GameEvent, GameStats, LevelConfig, Artifact } from "../types";

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

// 2. Generate Connect Level Config (Procedural Generation)
export const generateLevelConfig = async (level: number, stats: GameStats): Promise<LevelConfig> => {
  const ai = getAiClient();

  const fallbackLevel: LevelConfig = {
    planetName: "Sector 7-G (Safe Mode)",
    visualTheme: {
      backgroundPrompt: "Standard space station interior, neutral lighting",
      primaryColor: "#00ff00",
      secondaryColor: "#004400",
      hazardColor: "#ff0000"
    },
    physics: {
      gravity: -30,
      friction: 0.1,
      bumperBounce: 1.5,
      flipperStrength: 1.0
    },
    boss: {
      name: "Training Drone",
      description: "A basic target for target practice.",
      weakness: "CENTER",
      shieldStrength: 50
    },
    musicMood: "Calm, ambient"
  };

  if (!ai) return fallbackLevel;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: 'user', parts: [{
          text: `Generate a new "Void Cadet" pinball level.
          Level Number: ${level}.
          Player Stats:
          - Ramp Hits: ${stats.leftRampHits + stats.rightRampHits}
          - Bumper Hits: ${stats.bumperHits}
          - Drains: ${stats.drains}

          Create a unique sci-fi biome with drastic physical properties.
          Examples:
          - "The Void": Zero-G (gravity -2), low friction.
          - "Magma Core": High gravity (-60), very bouncy (restitution 3.0), red lighting.
          - "Cyber-Glitch": Normal gravity but flippers are super strong (2.0), neon colors.
          - "Ice Planet": Very low friction (0.01), slippery.

          If the player is doing well (high hits), make it harder (higher gravity, smaller bounce).
          If struggling (high drains), make it easier/funnier (low gravity).

          Return JSON matching the LevelConfig schema.
          For 'visualTheme', use strong, contrasting colors (hex codes).
          For 'musicMood', describe the genre/tempo (e.g. "Fast-paced Synthwave", "Eerie Ambient").` }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planetName: { type: Type.STRING },
            visualTheme: {
              type: Type.OBJECT,
              properties: {
                backgroundPrompt: { type: Type.STRING },
                primaryColor: { type: Type.STRING },
                secondaryColor: { type: Type.STRING },
                hazardColor: { type: Type.STRING }
              },
              required: ["backgroundPrompt", "primaryColor", "secondaryColor", "hazardColor"]
            },
            physics: {
              type: Type.OBJECT,
              properties: {
                gravity: { type: Type.NUMBER },
                friction: { type: Type.NUMBER },
                bumperBounce: { type: Type.NUMBER },
                flipperStrength: { type: Type.NUMBER }
              },
              required: ["gravity", "friction", "bumperBounce", "flipperStrength"]
            },
            boss: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                weakness: { type: Type.STRING, enum: ["LEFT", "RIGHT", "CENTER", "RAMPS", "BUMPERS"] },
                shieldStrength: { type: Type.NUMBER }
              },
              required: ["name", "description", "weakness", "shieldStrength"]
            },
            musicMood: { type: Type.STRING }
          },
          required: ["planetName", "visualTheme", "physics", "boss", "musicMood"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned for level config");
    return JSON.parse(text) as LevelConfig;

  } catch (e) {
    console.error("Gemini Level Gen Error:", e);
    return fallbackLevel;
  }
  model: "gemini-2.0-flash",
    contents: [{
      role: 'user', parts: [{
        text: `Generate a unique Sci-Fi Pinball Artifact (Upgrade) or Item.
          Player Rank: ${rank}.

          Types:
          - GRAVITY: Modifies gravity (value < 1.0 reduces it).
          - BOUNCE: Modifies bumper bounce (value > 1.0 increases it).
          - FLIPPER: Stronger flippers.
          - SCORE_MULTIPLIER: Multiplies score (e.g. 1.2x).
          - MULTIBALL: Chance to spawn extra balls.

          Return JSON matching the Artifact schema.
          Value should be appropriate multiplier (e.g. 1.1 to 2.0).` }]
    }],
      config: {
    responseMimeType: "application/json",
      responseSchema: {
      type: Type.OBJECT,
        properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        effectType: { type: Type.STRING, enum: ["GRAVITY", "BOUNCE", "FLIPPER", "SCORE_MULTIPLIER", "MULTIBALL"] },
        value: { type: Type.NUMBER }
      },
      required: ["name", "description", "effectType", "value"]
    }
  }
});

const text = response.text;
if (!text) return null;
const data = JSON.parse(text);
return { id: Math.random().toString(36).substr(2, 9), ...data } as Artifact;

    } catch (e) {
  console.error("Artifact Gen Error:", e);
  return null;
}
  };

// 3. Generate Sector Image
export const generateSectorImage = async (missionName: string): Promise<string | null> => {
  const ai = getAiClient();
  if (!ai) return null;

  try {
    const keywords = missionName.split(' ').join(',');
    return `https://image.pollinations.ai/prompt/sci-fi%20pinball%20sector%20${encodeURIComponent(missionName)}%20cyberpunk%20space?width=800&height=400&nologo=true`;
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
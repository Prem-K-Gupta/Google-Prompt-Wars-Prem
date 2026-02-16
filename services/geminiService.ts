import { GoogleGenAI, Modality, Type } from "@google/genai";
import { GameEvent } from "../types";

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

// 1. Generate Mission Narrative (Static Fallback)
// 1. Generate Mission Narrative (Static Fallback)
export const generateMissionContext = async (score: number, currentRank: string): Promise<{ name: string; description: string; rank: string }> => {
  const ai = getAiClient();
  const fallback = {
    name: "Nebula Outpost Defense",
    description: "Defend the outpost! Shoot the ramps to charge shields.",
    rank: currentRank
  };

  if (!ai) return fallback;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: 'user', parts: [{
          text: `Generate a sci-fi pinball mission. Current Score: ${score}. Current Rank: ${currentRank}.
      Return JSON with:
      - name: Cool mission name (e.g. "Void Sector Breach")
      - description: Short imperative objective (e.g. "Hit the bumpers to destabilize the core.")
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
  // Image generation is currently complex with the unified SDK, skipping for stability.
  return null;
};

// 3. Live Connection (The Admiral)
export class AdmiralLiveConnection {
  private ai: GoogleGenAI | null = null;
  private session: any = null; // Session type is complex in current SDK version
  public onAudioData: ((base64: string) => void) | null = null;
  public onTranscript: ((text: string) => void) | null = null;
  private currentTranscription = "";

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
        model: 'gemini-2.0-flash-exp', // Updated to latest experimental model for Live API
        callbacks: {
          onopen: () => console.log("Admiral Online"),
          onmessage: (msg: any) => this.handleMessage(msg),
          onclose: () => console.log("Admiral Offline"),
          onerror: (e: any) => console.error("Admiral Error", e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
          systemInstruction: { parts: [{ text: "You are the Fleet Admiral of a starship pinball interface. You provide terse, high-energy tactical commentary on the player's actions. Keep it extremely short (under 10 words). React to events like hits, drains, and missions. Use military sci-fi jargon." }] },
        }
      });
      console.log('Session Keys:', Object.keys(this.session || {}));
    } catch (e) {
      console.error("Failed to connect Live API", e);
    }
  }

  handleMessage(message: any) {
    // Handle Audio
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.onAudioData) {
      this.onAudioData(base64Audio);
    }

    // Handle Transcription
    if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
      this.currentTranscription += message.serverContent.modelTurn.parts[0].text;
    }

    if (message.serverContent?.turnComplete) {
      if (this.onTranscript && this.currentTranscription) {
        this.onTranscript(this.currentTranscription);
        this.currentTranscription = "";
      }
    }
  }

  async sendEvent(text: string) {
    if (this.session) {
      try {
        // Send text as input to trigger reaction
        // v1.x adaptation: sendClientContent usually calls for turns or parts
        // and turnComplete is part of the payload
        await this.session.sendClientContent({
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true
        });
      } catch (e) {
        console.error("Error sending event to Admiral:", e);
      }
    }
  }

  disconnect() {
    this.session = null;
  }
}
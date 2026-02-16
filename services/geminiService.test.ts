import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMissionContext, getApiKey } from '../services/geminiService';

// Mock the GoogleGenAI SDK
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
}));

vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            models = {
                generateContent: mockGenerateContent
            };
            live = {
                connect: vi.fn()
            };
        },
        Type: { OBJECT: 'OBJECT', STRING: 'STRING' },
        Modality: { AUDIO: 'AUDIO' }
    };
});

describe('geminiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateMissionContext', () => {
        it('returns fallback data when API key is missing', async () => {
            // Mock import.meta.env
            vi.stubEnv('VITE_GEMINI_API_KEY', '');
            vi.stubEnv('GEMINI_API_KEY', '');

            const result = await generateMissionContext(100, 'Cadet');
            expect(result.name).toBe('Nebula Outpost Defense');
        });

        it('returns parsed AI data when successful', async () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

            const mockResponse = {
                text: JSON.stringify({
                    name: "Test Mission",
                    description: "Do the thing",
                    rank: "Star Lord"
                })
            };
            mockGenerateContent.mockResolvedValue(mockResponse);

            const result = await generateMissionContext(5000, 'Captain');
            expect(result.name).toBe('Test Mission');
            expect(result.rank).toBe('Star Lord');
        });

        it('returns fallback on JSON parse error', async () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

            mockGenerateContent.mockResolvedValue({ text: "Not JSON" });

            const result = await generateMissionContext(5000, 'Captain');
            expect(result.name).toBe('Nebula Outpost Defense');
        });
    });
});

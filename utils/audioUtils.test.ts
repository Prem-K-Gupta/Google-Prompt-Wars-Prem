import { describe, it, expect } from 'vitest';
import { decode } from '../utils/audioUtils';

describe('audioUtils', () => {
    describe('decode', () => {
        it('decodes base64 string to Uint8Array', () => {
            const input = "SGVsbG8="; // "Hello"
            const result = decode(input);

            const expected = new Uint8Array([72, 101, 108, 108, 111]);
            expect(result).toEqual(expected);
        });

        it('handles empty string', () => {
            const result = decode("");
            expect(result.length).toBe(0);
        });
    });
});

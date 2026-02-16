// Mock window.atob
global.window = (global.window || {}) as any;
global.window.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

// Mock AudioContext
global.AudioContext = class {
    state = 'suspended';
    createBuffer() {
        return {
            getChannelData: () => new Float32Array(0)
        };
    }
    createBufferSource() {
        return {
            connect: () => { },
            start: () => { },
            onended: () => { }
        };
    }
    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
} as any;

// Mock import.meta.env if needed (Vitest usually handles this but good to be safe)
// Object.defineProperty(global, 'import', { value: { meta: { env: {} } } });

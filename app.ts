type ParsedLine = {
    idx: number; // index of the line in the input file
    offset: number; // byte offset in the input file pointing to the start of the line
    raw: string;
}

type AppState = {
    fileBlob: Blob;
    lines: ParsedLine[];

    visibleLines: number;
    totalHeight: number;
    lineHeight: number;

    topLineIdx: number; // index of the first line in the visible area
}

const createApp = () => {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const logContent = document.getElementById('log-content') as HTMLElement;
    const contentLines = document.getElementById('content-lines') as HTMLElement;
    const lineNumbers = document.getElementById('line-numbers') as HTMLElement;

    const state: AppState = {
        fileBlob: new Blob([]),
        lines: [],

        visibleLines: 50,
        totalHeight: 0,
        lineHeight: 16,

        topLineIdx: 0,
    };

    const formatVisibleLines = async (state: AppState): Promise<void> => {
        const lines = [];
        for (let idx = state.topLineIdx; idx < state.topLineIdx + state.visibleLines; idx++) {
            const line = state.lines[idx];
            if (line)
                lines.push(line.raw);
        }
        contentLines.innerHTML = lines.join('\n');
    }

    // Load and parse the file into memory from the beggining to the end
    const loadInputFile = async (state: AppState): Promise<void> => {
        const chunkSize = 4096; // bytes
        let eof = false;
        let offset = 0;
        let idx = 0;
        while (!eof) {
            eof = (offset + chunkSize >= state.fileBlob.size);
            const end = Math.min(offset + chunkSize, state.fileBlob.size);
            const chunk = state.fileBlob.slice(offset, end);
            const text = await chunk.text();
            const lines = text.split('\n');
            // remove last line as it is likely truncated
            if (lines.length > 1 && !eof)
                lines.pop();
            lines.forEach(rawLine => {
                const parsedLine: ParsedLine = {
                    idx: idx,
                    offset: offset,
                    raw: rawLine,
                };
                state.lines.push(parsedLine);
                offset += rawLine.length + 1;
                idx++;
            });
        }
    };

    const updateLineNumbers = async (startLine: number, count: number): Promise<void> => {
        lineNumbers.innerHTML = Array.from(
            { length: count },
            (_, i) => `${startLine + i + 1}`
        ).join('\n');
    };

    const updateTopLineIdx = (state: AppState, delta: number): void => {
        let newPosition = Math.min(state.lines.length - state.visibleLines, state.topLineIdx + delta);
        newPosition = Math.max(0, newPosition);
        state.topLineIdx = newPosition;
    };

    const handleScroll = async (e: WheelEvent) => {
        e.preventDefault();
        // scroll 4 lines at a time
        const linesToScroll = Math.sign(e.deltaY) * 4;
        updateTopLineIdx(state, linesToScroll);
    };

    // Handle keyboard navigation
    const handleKeyDown = async (e: KeyboardEvent) => {
        e.preventDefault();
        let linesToScroll = 0;
        switch (e.key) {
            case 'ArrowDown':
                linesToScroll = 1;
                break;
            case 'ArrowUp':
                linesToScroll = -1;
                break;
            case 'PageDown':
                linesToScroll = state.visibleLines;
                break;
            case 'PageUp':
                linesToScroll = -state.visibleLines;
                break;
            default:
                return;
        }
        updateTopLineIdx(state, linesToScroll);
    };

    const processFile = async (file: File): Promise<void> => {
        state.topLineIdx = 0;
        state.lines = [];
        state.fileBlob = file;
        loadInputFile(state);
    };

    const handleFileInput = (e: Event): void => {
        const files = (e.target as HTMLInputElement).files;
        if (files?.[0]) processFile(files[0]);
    };


    const updateView = async (state: AppState): Promise<void> => {
        updateLineNumbers(state.topLineIdx, state.visibleLines);
        formatVisibleLines(state);
    };

    // Recursive call of requestAnimationFrame() is a trick that makes browser call update() on every re-render.
    // updateView() is relatively cheap, and this allows us to not worry about calling it manually on every state change.
    const update = () => {
        updateView(state);
        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);


    // Setup event listeners
    fileInput.addEventListener('change', handleFileInput);
    logContent.addEventListener('wheel', handleScroll);
    document.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
        fileInput.removeEventListener('change', handleFileInput);
        logContent.removeEventListener('wheel', handleScroll);
        document.removeEventListener('keydown', handleKeyDown);
    };
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createApp();
});

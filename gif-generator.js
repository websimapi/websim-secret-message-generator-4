// Create a blob URL for the GIF worker to avoid MIME type issues.
let gifWorkerURL = null;

async function getGifWorkerURL(statusEl) {
    if (gifWorkerURL) {
        return gifWorkerURL;
    }
    try {
        statusEl.textContent = 'Loading GIF engine...';
        const response = await fetch('./gif.worker.js');
        if (!response.ok) {
            throw new Error(`Failed to fetch worker: ${response.statusText}`);
        }
        const workerScript = await response.text();
        // The script might be empty if there was an issue, check for that.
        if (!workerScript.trim()) {
            throw new Error('GIF worker script is empty.');
        }
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        gifWorkerURL = URL.createObjectURL(blob);
        return gifWorkerURL;
    } catch (e) {
        console.error("Error loading gif.worker.js:", e);
        statusEl.textContent = 'Error: Could not load GIF engine.';
        throw e;
    }
}

export class GifGenerator {
    constructor(frameManager, outputContainer, noiseCanvas, controls, statusEl) {
        this.frameManager = frameManager;
        this.outputContainer = outputContainer;
        this.noiseCanvas = noiseCanvas;
        this.controls = controls;
        this.statusEl = statusEl;
    }

    async generate(animationController) {
        const frames = this.frameManager.getFramesData();
        if (frames.length === 0) {
            this.statusEl.textContent = 'Add at least one frame.';
            return;
        }
        
        // Temporarily stop live animation
        const wasPlaying = animationController.isPlaying();
        if (wasPlaying) animationController.stop();

        const { width, height } = this.outputContainer.getBoundingClientRect();
        const fps = parseInt(this.controls.gifFps.value, 10);
        const delay = 1000 / fps;

        const workerScriptPath = await getGifWorkerURL(this.statusEl);

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: Math.floor(width),
            height: Math.floor(height),
            workerScript: workerScriptPath
        });

        // Create a temporary container for capturing frames
        const tempContainer = this.outputContainer.cloneNode(true);
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.width = width + 'px';
        tempContainer.style.height = height + 'px';
        document.body.appendChild(tempContainer);

        const tempScrambled = tempContainer.querySelector('#output-scrambled');
        const tempHidden = tempContainer.querySelector('#output-hidden');
        const tempNoiseCanvas = tempContainer.querySelector('#noise-canvas');

        // Copy current noise to temp canvas
        const tempCtx = tempNoiseCanvas.getContext('2d');
        tempCtx.drawImage(this.noiseCanvas, 0, 0);

        for (let i = 0; i < frames.length; i++) {
            this.statusEl.textContent = `Capturing frame ${i + 1}/${frames.length}...`;
            
            // Update temp container with current frame data
            tempScrambled.textContent = frames[i].scrambled;
            tempHidden.textContent = frames[i].hidden;

            // Wait for render
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capture the frame using html2canvas-like approach
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(width);
            canvas.height = Math.floor(height);
            const ctx = canvas.getContext('2d');

            // Draw background
            ctx.fillStyle = this.controls.bgColor.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw noise with opacity
            ctx.globalAlpha = parseFloat(this.controls.noiseOpacity.value);
            ctx.drawImage(this.noiseCanvas, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;

            // Manually render text elements
            await this.renderTextToCanvas(ctx, frames[i], canvas.width, canvas.height);

            gif.addFrame(canvas, { delay: delay, copy: true });
        }

        // Cleanup temp container
        document.body.removeChild(tempContainer);

        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'secret-message.gif';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.statusEl.textContent = 'GIF downloaded!';
            if (wasPlaying) animationController.start();
        });
        
        gif.on('progress', (p) => {
            this.statusEl.textContent = `Building GIF... ${Math.round(p * 100)}%`;
        });

        gif.render();
    }

    async renderTextToCanvas(ctx, frameData, canvasWidth, canvasHeight) {
        const fontSize = parseInt(this.controls.fontSize.value, 10);
        const fontWeight = this.controls.fontWeight.value;
        const letterSpacing = parseFloat(this.controls.letterSpacing.value);
        const lineHeight = parseFloat(this.controls.lineHeight.value);

        ctx.font = `${fontWeight} ${fontSize}px 'Courier New', Courier, monospace`;
        ctx.textBaseline = 'top';

        const baseX = 20; // matches CSS padding
        const baseY = 20;

        // Render scrambled text
        ctx.fillStyle = this.controls.scrambledColor.value;
        ctx.globalCompositeOperation = this.controls.scrambledBlendMode.value;
        this.drawTextWithSpacing(ctx, frameData.scrambled, baseX, baseY, letterSpacing, fontSize * lineHeight);

        // Render hidden text with offset
        const offsetX = parseInt(this.controls.hiddenOffsetX.value, 10);
        const offsetY = parseInt(this.controls.hiddenOffsetY.value, 10);
        ctx.fillStyle = this.controls.hiddenColor.value;
        ctx.globalCompositeOperation = this.controls.hiddenBlendMode.value;
        this.drawTextWithSpacing(ctx, frameData.hidden, baseX + offsetX, baseY + offsetY, letterSpacing, fontSize * lineHeight);

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
    }

    drawTextWithSpacing(ctx, text, x, y, letterSpacing, lineHeight) {
        const lines = text.split('\n');
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineY = y + (lineIndex * lineHeight);
            
            if (letterSpacing === 0) {
                ctx.fillText(line, x, lineY);
            } else {
                // Manual letter spacing
                let currentX = x;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    ctx.fillText(char, currentX, lineY);
                    currentX += ctx.measureText(char).width + letterSpacing;
                }
            }
        }
    }
}
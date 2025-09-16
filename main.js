import { NoiseGenerator } from './noise-generator.js';
import { FrameManager } from './frame-manager.js';
import { AnimationController } from './animation-controller.js';
import { GifGenerator } from './gif-generator.js';
import { UIController } from './ui-controller.js';

class App {
    constructor() {
        this.initElements();
        this.initComponents();
        this.setupEventListeners();
        this.initialSetup();
    }

    initElements() {
        this.framesList = document.getElementById('frames-list');
        this.addFrameBtn = document.getElementById('add-frame-btn');
        this.scrambledOutput = document.getElementById('output-scrambled');
        this.hiddenOutput = document.getElementById('output-hidden');
        this.outputContainer = document.getElementById('output-container');
        this.noiseCanvas = document.getElementById('noise-canvas');
        this.playPauseBtn = document.getElementById('play-pause-animation');
        this.generateGifBtn = document.getElementById('generate-gif-btn');
        this.gifStatusEl = document.getElementById('gif-status');

        this.controls = {
            scrambledColor: document.getElementById('scrambled-color'),
            scrambledBlendMode: document.getElementById('scrambled-blend-mode'),
            hiddenColor: document.getElementById('hidden-color'),
            hiddenBlendMode: document.getElementById('hidden-blend-mode'),
            hiddenOffsetX: document.getElementById('hidden-offset-x'),
            hiddenOffsetY: document.getElementById('hidden-offset-y'),
            fontSize: document.getElementById('font-size'),
            fontWeight: document.getElementById('font-weight'),
            letterSpacing: document.getElementById('letter-spacing'),
            lineHeight: document.getElementById('line-height'),
            bgColor: document.getElementById('bg-color'),
            noiseOpacity: document.getElementById('noise-opacity'),
            noiseType: document.getElementById('noise-type'),
            noiseScale: document.getElementById('noise-scale'),
            gifFps: document.getElementById('gif-fps'),
        };

        this.valueDisplays = {
            hiddenOffsetX: document.getElementById('hidden-offset-x-value'),
            hiddenOffsetY: document.getElementById('hidden-offset-y-value'),
            fontSize: document.getElementById('font-size-value'),
            fontWeight: document.getElementById('font-weight-value'),
            letterSpacing: document.getElementById('letter-spacing-value'),
            lineHeight: document.getElementById('line-height-value'),
            noiseOpacity: document.getElementById('noise-opacity-value'),
            noiseScale: document.getElementById('noise-scale-value'),
            gifFps: document.getElementById('gif-fps-value'),
        };
    }

    initComponents() {
        this.noiseGenerator = new NoiseGenerator(this.noiseCanvas);
        
        this.frameManager = new FrameManager(this.framesList, (action) => {
            if (action === 'remove') {
                this.animationController.stop();
            }
            this.updateOutput();
        });

        this.animationController = new AnimationController(
            this.frameManager, 
            (frameIndex) => this.updateOutput(frameIndex),
            this.playPauseBtn,
            this.controls.gifFps
        );

        this.gifGenerator = new GifGenerator(
            this.frameManager,
            this.outputContainer,
            this.noiseCanvas,
            this.controls,
            this.gifStatusEl
        );

        this.uiController = new UIController(this.controls, this.valueDisplays, this.noiseGenerator);
        this.uiController.setOnSettingsChange(() => {
            if (this.animationController.isPlaying()) {
                this.animationController.stop();
            }
        });
    }

    setupEventListeners() {
        this.addFrameBtn.addEventListener('click', () => {
            this.frameManager.createFrameInput();
        });

        this.generateGifBtn.addEventListener('click', async () => {
            this.generateGifBtn.disabled = true;
            this.playPauseBtn.disabled = true;
            this.gifStatusEl.textContent = 'Initializing...';
            
            try {
                await this.gifGenerator.generate(this.animationController);
            } catch (error) {
                console.error('GIF generation failed:', error);
                this.gifStatusEl.textContent = 'Generation failed.';
            } finally {
                this.generateGifBtn.disabled = false;
                this.playPauseBtn.disabled = false;
            }
        });

        // Resize observer for the output container
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                this.noiseCanvas.width = width;
                this.noiseCanvas.height = height;
                this.uiController.updateStyles();
            }
        });

        resizeObserver.observe(this.outputContainer);
    }

    updateOutput(frameIndex = null) {
        const frames = this.frameManager.getFramesData();
        if (frames.length > 0) {
            const currentFrameIndex = frameIndex !== null ? frameIndex : this.animationController.getCurrentFrame();
            const actualFrameIndex = currentFrameIndex % frames.length;
            const currentFrameData = frames[actualFrameIndex];
            
            // Highlight the current frame in the UI
            document.querySelectorAll('.frame-item').forEach((item, index) => {
                if (this.animationController.isPlaying()) {
                    item.style.borderColor = index === actualFrameIndex ? '#007bff' : '#ddd';
                } else {
                    item.style.borderColor = '#ddd';
                }
            });

            this.scrambledOutput.textContent = currentFrameData.scrambled;
            this.hiddenOutput.textContent = currentFrameData.hidden || '';
        } else {
            this.scrambledOutput.textContent = '';
            this.hiddenOutput.textContent = '';
            document.querySelectorAll('.frame-item').forEach(item => {
                item.style.borderColor = '#ddd';
            });
        }
    }

    initialSetup() {
        // Create initial frame
        this.frameManager.createFrameInput(
            'THISE ISW AJUMBLEF OF LETTERS ANDX WORDS TOD HIDES A MESSAGE.',
            'THIS IS A HIDDEN MESSAGE. YOU FOUND IT! GREAT JOB DETECTIVE!'
        );
        
        // Initial size setup
        const initialRect = this.outputContainer.getBoundingClientRect();
        this.noiseCanvas.width = initialRect.width;
        this.noiseCanvas.height = initialRect.height;
        
        this.uiController.updateStyles();
        this.updateOutput();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
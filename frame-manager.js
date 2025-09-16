import { generateScrambledText } from './text-scrambler.js';

export class FrameManager {
    constructor(framesList, onFrameChange) {
        this.framesList = framesList;
        this.onFrameChange = onFrameChange;
    }

    getFramesData() {
        return Array.from(this.framesList.querySelectorAll('.frame-item')).map(item => {
            const scrambledInput = item.querySelector('.scrambled-input');
            const hiddenInput = item.querySelector('.hidden-input');
            return {
                scrambled: scrambledInput ? scrambledInput.value : '',
                hidden: hiddenInput ? hiddenInput.value : ''
            };
        });
    }

    updateFrameNumbers() {
        const frameItems = this.framesList.querySelectorAll('.frame-item');
        frameItems.forEach((item, index) => {
            const header = item.querySelector('h4');
            if (header) {
                header.textContent = `Frame ${index + 1}`;
            }
        });
    }

    createFrameInput(scrambled = '', hidden = '') {
        const item = document.createElement('div');
        item.className = 'frame-item';

        const header = document.createElement('div');
        header.className = 'frame-item-header';

        const title = document.createElement('h4');
        // Title will be set by updateFrameNumbers

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-frame-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            item.remove();
            this.onFrameChange('remove');
            this.updateFrameNumbers();
        });
        
        header.appendChild(title);
        header.appendChild(removeBtn);

        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'frame-inputs';

        const scrambledGroup = document.createElement('div');
        scrambledGroup.className = 'input-group';
        const scrambledLabel = document.createElement('label');
        scrambledLabel.className = 'has-toggle';
        scrambledLabel.innerHTML = '<span>Scrambled Text (Red)</span>';

        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'auto-scramble-toggle';
        toggleContainer.title = 'Automatically generate scrambled text based on the hidden message.';
        const toggleLabel = document.createElement('span');
        toggleLabel.textContent = 'Auto-scramble';
        const toggleCheckbox = document.createElement('input');
        toggleCheckbox.type = 'checkbox';
        toggleCheckbox.checked = true;
        
        toggleContainer.appendChild(toggleLabel);
        toggleContainer.appendChild(toggleCheckbox);
        scrambledLabel.appendChild(toggleContainer);

        const scrambledTextarea = document.createElement('textarea');
        scrambledTextarea.className = 'scrambled-input';
        scrambledTextarea.rows = 4;
        scrambledTextarea.value = scrambled;
        scrambledTextarea.addEventListener('input', () => {
            toggleCheckbox.checked = false; // Disable auto-scramble on manual edit
            this.onFrameChange('update');
        });
        scrambledGroup.appendChild(scrambledLabel);
        scrambledGroup.appendChild(scrambledTextarea);

        const hiddenGroup = document.createElement('div');
        hiddenGroup.className = 'input-group';
        const hiddenLabel = document.createElement('label');
        hiddenLabel.textContent = 'Hidden Message (Cyan)';
        const hiddenTextarea = document.createElement('textarea');
        hiddenTextarea.className = 'hidden-input';
        hiddenTextarea.rows = 4;
        hiddenTextarea.value = hidden;
        hiddenTextarea.addEventListener('input', () => {
            if (toggleCheckbox.checked) {
                scrambledTextarea.value = generateScrambledText(hiddenTextarea.value);
            }
            this.onFrameChange('update');
        });
        hiddenGroup.appendChild(hiddenLabel);
        hiddenGroup.appendChild(hiddenTextarea);

        toggleCheckbox.addEventListener('change', () => {
            if (toggleCheckbox.checked) {
                // Re-enable and generate
                scrambledTextarea.value = generateScrambledText(hiddenTextarea.value);
                this.onFrameChange('update');
            }
        });

        // Initial generation if needed
        if (toggleCheckbox.checked && hidden.length > 0) {
            scrambledTextarea.value = generateScrambledText(hidden);
        }

        inputsDiv.appendChild(scrambledGroup);
        inputsDiv.appendChild(hiddenGroup);

        item.appendChild(header);
        item.appendChild(inputsDiv);
        
        this.framesList.appendChild(item);
        this.updateFrameNumbers();
        this.onFrameChange('add');
    }
}
// Interval Timer App - Avec éditeur visuel
class IntervalTimer {
    constructor() {
        this.programs = [];
        this.currentProgram = null;
        this.currentExerciseIndex = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.remainingTime = 0;
        this.isResting = false;
        this.timerInterval = null;
        this.audioContext = null;
        this.editingProgramIndex = -1;
        
        this.initAudio();
        this.loadPrograms();
        this.initEventListeners();
        this.initTabs();
    }

    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    playBeep(frequency = 800, duration = 0.2) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    loadPrograms() {
        const saved = localStorage.getItem('timerPrograms');
        if (saved) {
            this.programs = JSON.parse(saved);
        } else {
            this.programs = this.getDefaultPrograms();
            this.savePrograms();
        }
        this.updateUI();
    }

    savePrograms() {
        localStorage.setItem('timerPrograms', JSON.stringify(this.programs));
        this.updateUI();
    }

    getDefaultPrograms() {
        return [
            {
                name: "Épaule - Débutant",
                description: "Programme d'échauffement épaule",
                exercises: [
                    { name: "Rotation externe légère", duration: 30, rest: 15, sets: 3 },
                    { name: "Élévation latérale", duration: 30, rest: 15, sets: 3 }
                ]
            },
            {
                name: "Genou - Renforcement",
                description: "Renforcement quadriceps",
                exercises: [
                    { name: "Extension isométrique", duration: 20, rest: 10, sets: 4 },
                    { name: "Mini-squat", duration: 30, rest: 15, sets: 3 }
                ]
            }
        ];
    }

    updateUI() {
        this.updateProgramSelect();
        this.updateProgramList();
        this.updateJsonExport();
    }

    updateProgramSelect() {
        const select = document.getElementById('programSelect');
        select.innerHTML = '<option value="">Sélectionnez un programme...</option>';
        
        this.programs.forEach((program, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${program.name} (${program.exercises.length} exercices)`;
            select.appendChild(option);
        });
    }

    updateProgramList() {
        const container = document.getElementById('programList');
        
        if (this.programs.length === 0) {
            container.innerHTML = '<p style="color: #666;">Aucun programme. Créez-en un !</p>';
            return;
        }

        container.innerHTML = this.programs.map((program, index) => `
            <div class="program-card">
                <div class="program-card-header">
                    <div class="program-card-title">${program.name}</div>
                    <div class="program-card-actions">
                        <button class="icon-btn" onclick="app.editProgram(${index})">✏️</button>
                        <button class="icon-btn" onclick="app.duplicateProgram(${index})">📋</button>
                        <button class="icon-btn delete" onclick="app.deleteProgram(${index})">🗑️</button>
                    </div>
                </div>
                <div class="program-card-details">
                    ${program.description || 'Pas de description'}
                    <br>
                    📝 ${program.exercises.length} exercices
                </div>
            </div>
        `).join('');
    }

    updateJsonExport() {
        const output = document.getElementById('jsonOutput');
        output.textContent = JSON.stringify({ programs: this.programs }, null, 2);
    }

    // ===== TAB NAVIGATION =====
    initTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    // ===== TIMER FUNCTIONALITY =====
    initEventListeners() {
        document.getElementById('programSelect').addEventListener('change', (e) => {
            if (e.target.value !== '') {
                this.selectProgram(parseInt(e.target.value));
            }
        });

        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());

        // Editor events
        document.getElementById('newProgramBtn').addEventListener('click', () => this.newProgram());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('addExerciseBtn').addEventListener('click', () => this.addExercise());
        document.getElementById('saveProgramBtn').addEventListener('click', () => this.saveCurrentProgram());

        // Export/Import events
        document.getElementById('copyJsonBtn').addEventListener('click', () => this.copyJson());
        document.getElementById('importBtn').addEventListener('click', () => this.importJson());
    }

    selectProgram(index) {
        this.currentProgram = this.programs[index];
        this.currentExerciseIndex = 0;
        this.updateDisplay();
    }

    start() {
        if (!this.currentProgram) {
            alert('⚠️ Veuillez sélectionner un programme');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.currentExerciseIndex = 0;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
        document.getElementById('programSelect').disabled = true;

        this.runExercise();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        
        if (this.isPaused) {
            btn.textContent = '▶️ Reprendre';
            document.getElementById('status').textContent = '⏸️ EN PAUSE';
        } else {
            btn.textContent = '⏸️ Pause';
            this.runTimer();
        }
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.timerInterval);
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('programSelect').disabled = false;
        
        document.getElementById('status').textContent = 'Session arrêtée';
        document.getElementById('timer').textContent = '00:00';
    }

    async runExercise() {
        if (!this.isRunning) return;

        const exercises = this.currentProgram.exercises;
        
        if (this.currentExerciseIndex >= exercises.length) {
            this.complete();
            return;
        }

        const exercise = exercises[this.currentExerciseIndex];
        document.getElementById('exerciseName').textContent = exercise.name;

        for (let set = 1; set <= exercise.sets; set++) {
            if (!this.isRunning) return;

            this.isResting = false;
            document.getElementById('status').textContent = `🏃 TRAVAIL - Série ${set}/${exercise.sets}`;
            this.playBeep(800, 0.2);
            
            await this.countdown(exercise.duration, false);
            
            if (!this.isRunning) return;

            if (set < exercise.sets) {
                this.isResting = true;
                document.getElementById('status').textContent = `💤 REPOS - Série ${set}/${exercise.sets}`;
                this.playBeep(400, 0.2);
                
                await this.countdown(exercise.rest, true);
            }
        }

        this.currentExerciseIndex++;
        this.runExercise();
    }

    countdown(seconds, isRest) {
        return new Promise((resolve) => {
            this.remainingTime = seconds;
            
            const runTimer = () => {
                if (!this.isRunning) {
                    resolve();
                    return;
                }

                if (this.isPaused) {
                    setTimeout(runTimer, 100);
                    return;
                }

                this.updateDisplay();

                if (this.remainingTime <= 0) {
                    resolve();
                    return;
                }

                this.remainingTime--;
                setTimeout(runTimer, 1000);
            };

            runTimer();
        });
    }

    updateDisplay() {
        const mins = Math.floor(this.remainingTime / 60);
        const secs = this.remainingTime % 60;
        const timerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        const timerEl = document.getElementById('timer');
        timerEl.textContent = timerText;
        timerEl.className = this.isResting ? 'timer resting' : 'timer working';
        
        const total = this.currentProgram.exercises.length;
        const current = this.currentExerciseIndex + 1;
        document.getElementById('progress').textContent = `${current} / ${total}`;
    }

    complete() {
        this.playBeep(1000, 0.5);
        setTimeout(() => this.playBeep(1200, 0.5), 200);
        
        document.getElementById('status').textContent = '🎉 SESSION TERMINÉE !';
        document.getElementById('timer').textContent = '✓';
        this.stop();
    }

    // ===== EDITOR FUNCTIONALITY =====
    newProgram() {
        this.editingProgramIndex = -1;
        document.getElementById('editorTitle').textContent = '➕ Nouveau programme';
        document.getElementById('programName').value = '';
        document.getElementById('programDescription').value = '';
        document.getElementById('exercisesList').innerHTML = '';
        this.addExercise();
        document.getElementById('editorForm').style.display = 'block';
    }

    editProgram(index) {
        this.editingProgramIndex = index;
        const program = this.programs[index];
        
        document.getElementById('editorTitle').textContent = '✏️ Éditer le programme';
        document.getElementById('programName').value = program.name;
        document.getElementById('programDescription').value = program.description || '';
        
        const container = document.getElementById('exercisesList');
        container.innerHTML = '';
        
        program.exercises.forEach((ex, i) => {
            this.addExercise(ex);
        });
        
        document.getElementById('editorForm').style.display = 'block';
    }

    duplicateProgram(index) {
        const program = JSON.parse(JSON.stringify(this.programs[index]));
        program.name = program.name + ' (copie)';
        this.programs.push(program);
        this.savePrograms();
    }

    deleteProgram(index) {
        if (confirm(`Supprimer le programme "${this.programs[index].name}" ?`)) {
            this.programs.splice(index, 1);
            this.savePrograms();
        }
    }

    cancelEdit() {
        document.getElementById('editorForm').style.display = 'none';
    }

    addExercise(exercise = null) {
        const container = document.getElementById('exercisesList');
        const index = container.children.length;
        
        const div = document.createElement('div');
        div.className = 'exercise-editor';
        div.innerHTML = `
            <div class="exercise-editor-header">
                <span class="exercise-number">Exercice ${index + 1}</span>
                <button class="icon-btn delete" onclick="this.parentElement.parentElement.remove()">🗑️</button>
            </div>
            <div class="form-group">
                <label class="form-label">Nom de l'exercice</label>
                <input type="text" class="ex-name" value="${exercise?.name || ''}" placeholder="ex: Rotation externe">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Durée (sec)</label>
                    <input type="number" class="ex-duration" value="${exercise?.duration || 30}" min="1">
                </div>
                <div class="form-group">
                    <label class="form-label">Repos (sec)</label>
                    <input type="number" class="ex-rest" value="${exercise?.rest || 15}" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Séries</label>
                    <input type="number" class="ex-sets" value="${exercise?.sets || 3}" min="1">
                </div>
            </div>
        `;
        
        container.appendChild(div);
    }
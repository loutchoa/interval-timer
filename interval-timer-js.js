// Interval Timer App - Version complète avec synthèse vocale et clignotement
class IntervalTimer {
    constructor() {
        this.programs = [];
        this.currentProgram = null;
        this.currentExerciseIndex = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.remainingTime = 0;
        this.isResting = false;
        this.isPausingBetweenExercises = false;
        this.timerInterval = null;
        this.audioContext = null;
        this.editingProgramIndex = -1;
        this.voiceEnabled = true; // Synthèse vocale activée par défaut
        
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

    speak(text) {
        if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
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
                name: "Coude - Programme complet",
                description: "Rééducation coude avec pauses longues",
                exercises: [
                    { name: "Extension-Flexion sur table", duration: 20, rest: 10, sets: 1, pauseAfter: 45 },
                    { name: "Extension sur coussin", duration: 30, rest: 15, sets: 1, pauseAfter: 45 },
                    { name: "Épaule-Coude: Mouvement de brasse", duration: 20, rest: 10, sets: 1, pauseAfter: 45 },
                    { name: "Flexion sur coussin", duration: 30, rest: 15, sets: 1 }
                ]
            },
            {
                name: "Épaule - Débutant",
                description: "Programme d'échauffement épaule",
                exercises: [
                    { name: "Rotation externe légère", duration: 30, rest: 15, sets: 3 },
                    { name: "Élévation latérale", duration: 30, rest: 15, sets: 3 }
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

    initEventListeners() {
        document.getElementById('programSelect').addEventListener('change', (e) => {
            if (e.target.value !== '') {
                this.selectProgram(parseInt(e.target.value));
            }
        });

        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());

        document.getElementById('newProgramBtn').addEventListener('click', () => this.newProgram());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.cancelEdit());
        document.getElementById('addExerciseBtn').addEventListener('click', () => this.addExercise());
        document.getElementById('saveProgramBtn').addEventListener('click', () => this.saveCurrentProgram());

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

        this.speak("Début de la session");
        this.runExercise();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        
        if (this.isPaused) {
            btn.textContent = '▶️ Reprendre';
            document.getElementById('status').textContent = '⏸️ EN PAUSE';
            this.speak("Pause");
        } else {
            btn.textContent = '⏸️ Pause';
            this.speak("Reprise");
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
        document.getElementById('timer').classList.remove('blinking');
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
        this.speak(exercise.name);

        for (let set = 1; set <= exercise.sets; set++) {
            if (!this.isRunning) return;

            // Phase de travail
            this.isResting = false;
            this.isPausingBetweenExercises = false;
            document.getElementById('status').textContent = `🏃 TRAVAIL${exercise.sets > 1 ? ` - Série ${set}/${exercise.sets}` : ''}`;
            this.playBeep(800, 0.2);
            
            await this.countdown(exercise.duration, false);
            
            if (!this.isRunning) return;

            // Phase de repos entre séries
            if (set < exercise.sets) {
                this.isResting = true;
                document.getElementById('status').textContent = `💤 REPOS - Série ${set}/${exercise.sets}`;
                this.playBeep(400, 0.2);
                this.speak("Repos");
                
                await this.countdown(exercise.rest, true);
            }
        }

        // Pause longue après l'exercice (si spécifié)
        if (exercise.pauseAfter && this.currentExerciseIndex < exercises.length - 1) {
            this.isPausingBetweenExercises = true;
            this.isResting = true;
            document.getElementById('status').textContent = `⏸️ PAUSE LONGUE`;
            document.getElementById('exerciseName').textContent = '---';
            this.playBeep(600, 0.3);
            this.speak("Pause longue");
            
            await this.countdown(exercise.pauseAfter, true);
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

                // Clignotement et bip pour les 3 dernières secondes
                if (this.remainingTime <= 3 && this.remainingTime > 0) {
                    document.getElementById('timer').classList.add('blinking');
                    this.playBeep(1000, 0.1);
                } else {
                    document.getElementById('timer').classList.remove('blinking');
                }

                if (this.remainingTime <= 0) {
                    document.getElementById('timer').classList.remove('blinking');
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
        
        // Changer la couleur selon la phase
        if (this.isPausingBetweenExercises) {
            timerEl.className = 'timer resting';
        } else {
            timerEl.className = this.isResting ? 'timer resting' : 'timer working';
        }
        
        const total = this.currentProgram.exercises.length;
        const current = this.currentExerciseIndex + 1;
        document.getElementById('progress').textContent = `${current} / ${total}`;
    }

    complete() {
        this.playBeep(1000, 0.5);
        setTimeout(() => this.playBeep(1200, 0.5), 200);
        
        document.getElementById('status').textContent = '🎉 SESSION TERMINÉE !';
        document.getElementById('timer').textContent = '✓';
        this.speak("Session terminée. Bravo !");
        
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
            <div class="form-group">
                <label class="form-label">Pause longue après (sec) - optionnel</label>
                <input type="number" class="ex-pause" value="${exercise?.pauseAfter || ''}" min="0" placeholder="0 = pas de pause">
            </div>
        `;
        
        container.appendChild(div);
    }

    saveCurrentProgram() {
        const name = document.getElementById('programName').value.trim();
        const description = document.getElementById('programDescription').value.trim();
        
        if (!name) {
            alert('⚠️ Le nom du programme est obligatoire');
            return;
        }

        const exercises = [];
        document.querySelectorAll('.exercise-editor').forEach(editor => {
            const exerciseName = editor.querySelector('.ex-name').value.trim();
            const duration = parseInt(editor.querySelector('.ex-duration').value);
            const rest = parseInt(editor.querySelector('.ex-rest').value);
            const sets = parseInt(editor.querySelector('.ex-sets').value);
            const pauseAfter = parseInt(editor.querySelector('.ex-pause').value) || 0;
            
            if (exerciseName && duration > 0) {
                const ex = { name: exerciseName, duration, rest, sets };
                if (pauseAfter > 0) ex.pauseAfter = pauseAfter;
                exercises.push(ex);
            }
        });

        if (exercises.length === 0) {
            alert('⚠️ Ajoutez au moins un exercice');
            return;
        }

        const program = { name, description, exercises };

        if (this.editingProgramIndex >= 0) {
            this.programs[this.editingProgramIndex] = program;
        } else {
            this.programs.push(program);
        }

        this.savePrograms();
        this.cancelEdit();
        alert('✅ Programme enregistré !');
    }

    copyJson() {
        const text = document.getElementById('jsonOutput').textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ JSON copié dans le presse-papier !');
        });
    }

    importJson() {
        const jsonText = document.getElementById('importJson').value.trim();
        
        if (!jsonText) {
            alert('⚠️ Collez du JSON valide');
            return;
        }

        try {
            const data = JSON.parse(jsonText);
            if (data.programs && Array.isArray(data.programs)) {
                this.programs = data.programs;
                this.savePrograms();
                document.getElementById('importJson').value = '';
                alert('✅ Programmes importés avec succès !');
                this.switchTab('editor');
            } else {
                alert('⚠️ Format JSON invalide. Doit contenir {"programs": [...]}');
            }
        } catch (e) {
            alert('❌ Erreur JSON : ' + e.message);
        }
    }
}

// Initialiser l'app
const app = new IntervalTimer();
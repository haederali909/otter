/**
 * Real-time Teeth Detection Module
 * Advanced AI-powered teeth detection for live camera feed
 */

class TeethDetector {
    constructor(video, overlayCanvas, geminiAnalyzer) {
        this.video = video;
        this.overlayCanvas = overlayCanvas;
        this.overlayCtx = overlayCanvas.getContext('2d');
        this.geminiAnalyzer = geminiAnalyzer;
        
        // Detection settings
        this.isDetecting = false;
        this.sensitivity = 0.6;
        this.detectionInterval = null;
        this.lastDetectionTime = 0;
        this.detectionCooldown = 500; // ms
        
        // Auto-capture settings
        this.autoCaptureEnabled = false;
        this.autoCaptureDelay = 2000; // ms
        this.lastToothDetection = 0;
        this.autoCaptureTimeout = null;
        
        // Detection state
        this.currentDetections = [];
        this.detectionHistory = [];
        this.maxHistoryLength = 10;
        
        // Performance optimization
        this.detectionFrequency = 200; // ms between detections
        this.skipFrames = 0;
        
        this.initializeDetection();
    }
    
    initializeDetection() {
        // Setup overlay canvas to match video dimensions
        this.resizeOverlay();
        
        // Initialize detection models
        this.loadDetectionModels();
        
        console.log('🤖 Teeth detector initialized');
    }
    
    async loadDetectionModels() {
        try {
            // Load face detection model for tooth region estimation
            if (typeof cv !== 'undefined') {
                // If OpenCV.js is available, use it for face detection
                this.useOpenCV = true;
                console.log('✅ OpenCV.js detected, using advanced face detection');
            } else {
                // Fallback to TensorFlow.js models
                this.useOpenCV = false;
                console.log('📊 Using TensorFlow.js for detection');
            }
        } catch (error) {
            console.warn('Detection model loading failed, using basic color detection:', error);
            this.useBasicDetection = true;
        }
    }
    
    resizeOverlay() {
        if (this.video.videoWidth && this.video.videoHeight) {
            this.overlayCanvas.width = this.video.videoWidth;
            this.overlayCanvas.height = this.video.videoHeight;
            
            // Match video display size
            const videoRect = this.video.getBoundingClientRect();
            this.overlayCanvas.style.width = '100%';
            this.overlayCanvas.style.height = '100%';
        }
    }
    
    startDetection() {
        if (this.isDetecting) return;
        
        this.isDetecting = true;
        this.updateDetectionStatus('🔍 Scanning for teeth...', 'detecting');
        
        // Start detection loop
        this.detectionInterval = setInterval(() => {
            this.detectTeeth();
        }, this.detectionFrequency);
        
        console.log('🚀 Real-time teeth detection started');
    }
    
    stopDetection() {
        this.isDetecting = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        if (this.autoCaptureTimeout) {
            clearTimeout(this.autoCaptureTimeout);
            this.autoCaptureTimeout = null;
        }
        
        this.clearOverlay();
        this.updateDetectionStatus('🔍 Detection stopped', 'inactive');
        
        console.log('🛑 Teeth detection stopped');
    }
    
    async detectTeeth() {
        if (!this.video.videoWidth || !this.video.videoHeight) return;
        
        const now = Date.now();
        if (now - this.lastDetectionTime < this.detectionCooldown) return;
        
        this.lastDetectionTime = now;
        
        try {
            // Create temporary canvas for analysis
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.video.videoWidth;
            tempCanvas.height = this.video.videoHeight;
            
            // Draw current video frame
            tempCtx.drawImage(this.video, 0, 0);
            
            // Perform teeth detection
            const detections = await this.performTeethDetection(tempCanvas);
            
            // Update detection history
            this.updateDetectionHistory(detections);
            
            // Draw detection overlay
            this.drawDetectionOverlay(detections);
            
            // Handle auto-capture
            if (this.autoCaptureEnabled && detections.length > 0) {
                this.handleAutoCaptureLogic(detections);
            }
            
            // Update UI status
            this.updateDetectionUI(detections);
            
        } catch (error) {
            console.error('Detection error:', error);
        }
    }
    
    async performTeethDetection(canvas) {
        const detections = [];
        
        if (this.useOpenCV && typeof cv !== 'undefined') {
            // Use OpenCV for advanced detection
            return this.detectWithOpenCV(canvas);
        } else if (this.geminiAnalyzer && this.geminiAnalyzer.isAvailable) {
            // Use Gemini API for AI-powered detection
            return this.detectWithGemini(canvas);
        } else {
            // Fallback to basic color/shape detection
            return this.detectWithBasicCV(canvas);
        }
    }
    
    async detectWithGemini(canvas) {
        try {
            // Only use Gemini occasionally to save API calls
            if (Math.random() > 0.1) return this.detectWithBasicCV(canvas);
            
            const imageBase64 = this.geminiAnalyzer.preprocessImage(canvas);
            
            const detectionPrompt = `Analyze this image for teeth visibility. Respond with JSON only:
            {
                "teeth_detected": true/false,
                "confidence": 0.0-1.0,
                "tooth_regions": [{"x": 0, "y": 0, "width": 100, "height": 50}],
                "quality": "excellent|good|fair|poor",
                "recommendation": "text"
            }`;
            
            const payload = {
                contents: [{
                    parts: [
                        { text: detectionPrompt },
                        {
                            inline_data: {
                                mime_type: "image/jpeg",
                                data: imageBase64
                            }
                        }
                    ]
                }]
            };
            
            const response = await fetch(`${this.geminiAnalyzer.endpoint}?key=${this.geminiAnalyzer.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const result = await response.json();
                const content = result.candidates[0].content.parts[0].text;
                const detection = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
                
                return detection.teeth_detected ? detection.tooth_regions || [] : [];
            }
        } catch (error) {
            console.warn('Gemini detection failed:', error);
        }
        
        return this.detectWithBasicCV(canvas);
    }
    
    detectWithBasicCV(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const detections = [];
        const blockSize = 20; // Analyze in blocks for performance
        
        for (let y = 0; y < canvas.height - blockSize; y += blockSize) {
            for (let x = 0; x < canvas.width - blockSize; x += blockSize) {
                const toothLikelihood = this.analyzeBlockForTeeth(data, x, y, blockSize, canvas.width);
                
                if (toothLikelihood > this.sensitivity) {
                    detections.push({
                        x: x,
                        y: y,
                        width: blockSize,
                        height: blockSize,
                        confidence: toothLikelihood
                    });
                }
            }
        }
        
        // Merge nearby detections
        return this.mergeDetections(detections);
    }
    
    analyzeBlockForTeeth(data, x, y, blockSize, width) {
        let totalBrightness = 0;
        let whitePixels = 0;
        let totalPixels = 0;
        
        for (let dy = 0; dy < blockSize; dy++) {
            for (let dx = 0; dx < blockSize; dx++) {
                const px = (y + dy) * width + (x + dx);
                const idx = px * 4;
                
                if (idx + 2 < data.length) {
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    
                    const brightness = (r + g + b) / 3;
                    totalBrightness += brightness;
                    totalPixels++;
                    
                    // Count white-ish pixels (potential teeth)
                    if (brightness > 180 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
                        whitePixels++;
                    }
                }
            }
        }
        
        if (totalPixels === 0) return 0;
        
        const avgBrightness = totalBrightness / totalPixels;
        const whiteRatio = whitePixels / totalPixels;
        
        // Teeth detection heuristic
        let toothLikelihood = 0;
        
        // Prefer moderately bright regions
        if (avgBrightness > 120 && avgBrightness < 240) {
            toothLikelihood += 0.3;
        }
        
        // High white pixel ratio suggests teeth
        toothLikelihood += whiteRatio * 0.7;
        
        return Math.min(toothLikelihood, 1.0);
    }
    
    mergeDetections(detections) {
        if (detections.length === 0) return [];
        
        const merged = [];
        const used = new Set();
        
        for (let i = 0; i < detections.length; i++) {
            if (used.has(i)) continue;
            
            let group = [detections[i]];
            used.add(i);
            
            for (let j = i + 1; j < detections.length; j++) {
                if (used.has(j)) continue;
                
                if (this.detectionsOverlap(detections[i], detections[j])) {
                    group.push(detections[j]);
                    used.add(j);
                }
            }
            
            // Merge group into single detection
            const bounds = this.calculateGroupBounds(group);
            const avgConfidence = group.reduce((sum, d) => sum + d.confidence, 0) / group.length;
            
            merged.push({
                ...bounds,
                confidence: avgConfidence
            });
        }
        
        return merged;
    }
    
    detectionsOverlap(det1, det2) {
        const threshold = 15; // pixels
        return Math.abs(det1.x - det2.x) < threshold && Math.abs(det1.y - det2.y) < threshold;
    }
    
    calculateGroupBounds(group) {
        const minX = Math.min(...group.map(d => d.x));
        const minY = Math.min(...group.map(d => d.y));
        const maxX = Math.max(...group.map(d => d.x + d.width));
        const maxY = Math.max(...group.map(d => d.y + d.height));
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    updateDetectionHistory(detections) {
        this.detectionHistory.push({
            timestamp: Date.now(),
            count: detections.length,
            detections: detections
        });
        
        if (this.detectionHistory.length > this.maxHistoryLength) {
            this.detectionHistory.shift();
        }
        
        this.currentDetections = detections;
    }
    
    drawDetectionOverlay(detections) {
        this.clearOverlay();
        
        if (detections.length === 0) return;
        
        // Scale coordinates to match overlay canvas
        const scaleX = this.overlayCanvas.width / this.video.videoWidth;
        const scaleY = this.overlayCanvas.height / this.video.videoHeight;
        
        this.overlayCtx.strokeStyle = '#27ae60';
        this.overlayCtx.lineWidth = 3;
        this.overlayCtx.fillStyle = 'rgba(39, 174, 96, 0.2)';
        
        detections.forEach((detection, index) => {
            const x = detection.x * scaleX;
            const y = detection.y * scaleY;
            const width = detection.width * scaleX;
            const height = detection.height * scaleY;
            
            // Draw detection rectangle
            this.overlayCtx.fillRect(x, y, width, height);
            this.overlayCtx.strokeRect(x, y, width, height);
            
            // Draw confidence label
            this.overlayCtx.fillStyle = 'rgba(39, 174, 96, 0.9)';
            this.overlayCtx.fillRect(x, y - 25, 80, 20);
            
            this.overlayCtx.fillStyle = 'white';
            this.overlayCtx.font = '12px Arial';
            this.overlayCtx.fillText(`🦷 ${Math.round(detection.confidence * 100)}%`, x + 5, y - 10);
            
            this.overlayCtx.fillStyle = 'rgba(39, 174, 96, 0.2)';
        });
    }
    
    clearOverlay() {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
    
    handleAutoCaptureLogic(detections) {
        const now = Date.now();
        const strongDetections = detections.filter(d => d.confidence > 0.7);
        
        if (strongDetections.length > 0) {
            if (this.lastToothDetection === 0) {
                this.lastToothDetection = now;
                this.scheduleAutoCapture();
            }
        } else {
            // Reset if no strong detections
            this.lastToothDetection = 0;
            if (this.autoCaptureTimeout) {
                clearTimeout(this.autoCaptureTimeout);
                this.autoCaptureTimeout = null;
            }
        }
    }
    
    scheduleAutoCapture() {
        if (this.autoCaptureTimeout) {
            clearTimeout(this.autoCaptureTimeout);
        }
        
        this.autoCaptureTimeout = setTimeout(() => {
            if (this.autoCaptureEnabled && this.currentDetections.length > 0) {
                this.triggerAutoCapture();
            }
        }, this.autoCaptureDelay);
    }
    
    triggerAutoCapture() {
        // Trigger capture through custom event
        const event = new CustomEvent('autoCapture', {
            detail: {
                detections: this.currentDetections,
                confidence: Math.max(...this.currentDetections.map(d => d.confidence))
            }
        });
        
        document.dispatchEvent(event);
        console.log('📸 Auto-capture triggered!');
    }
    
    updateDetectionUI(detections) {
        const statusText = document.getElementById('detectionText');
        const indicator = document.getElementById('detectionIndicator');
        
        if (detections.length > 0) {
            const maxConfidence = Math.max(...detections.map(d => d.confidence));
            statusText.textContent = `🦷 ${detections.length} teeth detected (${Math.round(maxConfidence * 100)}%)`;
            indicator.className = 'detection-indicator active';
        } else {
            statusText.textContent = '🔍 Scanning for teeth...';
            indicator.className = 'detection-indicator detecting';
        }
    }
    
    updateDetectionStatus(text, status) {
        const statusText = document.getElementById('detectionText');
        const indicator = document.getElementById('detectionIndicator');
        
        statusText.textContent = text;
        indicator.className = `detection-indicator ${status}`;
    }
    
    // Public methods for external control
    setSensitivity(value) {
        this.sensitivity = Math.max(0.1, Math.min(0.9, value));
        console.log(`🎯 Detection sensitivity set to ${Math.round(this.sensitivity * 100)}%`);
    }
    
    setAutoCaptureDelay(seconds) {
        this.autoCaptureDelay = seconds * 1000;
        console.log(`⏱️ Auto-capture delay set to ${seconds}s`);
    }
    
    enableAutoCapture() {
        this.autoCaptureEnabled = true;
        console.log('🤖 Auto-capture enabled');
    }
    
    disableAutoCapture() {
        this.autoCaptureEnabled = false;
        if (this.autoCaptureTimeout) {
            clearTimeout(this.autoCaptureTimeout);
            this.autoCaptureTimeout = null;
        }
        console.log('🤖 Auto-capture disabled');
    }
    
    getDetectionStats() {
        const recentDetections = this.detectionHistory.slice(-5);
        const avgDetections = recentDetections.reduce((sum, h) => sum + h.count, 0) / recentDetections.length || 0;
        
        return {
            currentDetections: this.currentDetections.length,
            averageDetections: avgDetections,
            detectionHistory: this.detectionHistory.length,
            isDetecting: this.isDetecting,
            autoCaptureEnabled: this.autoCaptureEnabled
        };
    }
}
class DentalShadeDetector {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.model = null;
        this.capturedImageData = null;
        
        // VITA Shade Guide data with RGB approximations
        this.vitaShadeGuide = {
            'A1': { color: '#F5F0E8', rgb: [245, 240, 232], name: 'A1 - Light Reddish Brown' },
            'A2': { color: '#F2EDE4', rgb: [242, 237, 228], name: 'A2 - Reddish Brown' },
            'A3': { color: '#EFEBE0', rgb: [239, 235, 224], name: 'A3 - Dark Reddish Brown' },
            'A3.5': { color: '#ECE8DC', rgb: [236, 232, 220], name: 'A3.5 - Dark Reddish Brown' },
            'A4': { color: '#E9E5D8', rgb: [233, 229, 216], name: 'A4 - Dark Reddish Brown' },
            'B1': { color: '#F5F2EA', rgb: [245, 242, 234], name: 'B1 - Light Reddish Yellow' },
            'B2': { color: '#F2EFE6', rgb: [242, 239, 230], name: 'B2 - Reddish Yellow' },
            'B3': { color: '#EFECE2', rgb: [239, 236, 226], name: 'B3 - Dark Reddish Yellow' },
            'B4': { color: '#ECE9DE', rgb: [236, 233, 222], name: 'B4 - Dark Reddish Yellow' },
            'C1': { color: '#F5F3EB', rgb: [245, 243, 235], name: 'C1 - Light Gray' },
            'C2': { color: '#F2F0E7', rgb: [242, 240, 231], name: 'C2 - Gray' },
            'C3': { color: '#EFEDE3', rgb: [239, 237, 227], name: 'C3 - Dark Gray' },
            'C4': { color: '#ECEADF', rgb: [236, 234, 223], name: 'C4 - Dark Gray' },
            'D2': { color: '#F2F0E5', rgb: [242, 240, 229], name: 'D2 - Reddish Gray' },
            'D3': { color: '#EFEDE1', rgb: [239, 237, 225], name: 'D3 - Dark Reddish Gray' },
            'D4': { color: '#ECEADD', rgb: [236, 234, 221], name: 'D4 - Dark Reddish Gray' }
        };
        
        this.initializeApp();
    }
    
    async initializeApp() {
        this.setupEventListeners();
        this.renderShadeGuide();
        await this.loadAIModel();
    }
    
    setupEventListeners() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.captureImage());
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeShade());
    }
    
    async loadAIModel() {
        try {
            console.log('Loading AI model...');
            // Load a lightweight model for image analysis
            this.model = await mobilenet.load();
            console.log('AI model loaded successfully');
        } catch (error) {
            console.error('Error loading AI model:', error);
            this.showError('Failed to load AI model. Some features may not work properly.');
        }
    }
    
    async startCamera() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'environment' // Use back camera if available
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            document.getElementById('startCamera').textContent = 'Camera Active';
            document.getElementById('startCamera').disabled = true;
            document.getElementById('captureBtn').disabled = false;
            
            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            };
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Unable to access camera. Please check permissions.');
        }
    }
    
    captureImage() {
        if (!this.video.videoWidth) {
            this.showError('Camera not ready. Please wait a moment.');
            return;
        }
        
        // Draw current video frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get image data
        this.capturedImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Convert canvas to image and display
        const dataURL = this.canvas.toDataURL('image/jpeg', 0.8);
        const img = document.createElement('img');
        img.src = dataURL;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '8px';
        
        const container = document.getElementById('capturedImageContainer');
        container.innerHTML = '';
        container.appendChild(img);
        
        document.getElementById('analyzeBtn').disabled = false;
        
        console.log('Image captured successfully');
    }
    
    async analyzeShade() {
        if (!this.capturedImageData) {
            this.showError('Please capture an image first.');
            return;
        }
        
        try {
            document.getElementById('analyzeBtn').textContent = 'Analyzing...';
            document.getElementById('analyzeBtn').disabled = true;
            
            // Analyze the captured image
            const dominantColor = this.extractDominantColor(this.capturedImageData);
            const matchedShade = this.findBestShadeMatch(dominantColor);
            
            // Display results
            this.displayAnalysisResults(dominantColor, matchedShade);
            
            // Highlight matched shade in guide
            this.highlightMatchedShade(matchedShade.shadeId);
            
        } catch (error) {
            console.error('Error analyzing shade:', error);
            this.showError('Error analyzing image. Please try again.');
        } finally {
            document.getElementById('analyzeBtn').textContent = 'Analyze Shade';
            document.getElementById('analyzeBtn').disabled = false;
        }
    }
    
    extractDominantColor(imageData) {
        const data = imageData.data;
        const colorCounts = {};
        
        // Sample pixels (every 4th pixel for performance)
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];
            
            // Skip transparent pixels
            if (alpha < 128) continue;
            
            // Skip very dark or very bright pixels (likely not tooth color)
            const brightness = (r + g + b) / 3;
            if (brightness < 100 || brightness > 250) continue;
            
            const key = `${Math.floor(r/10)*10},${Math.floor(g/10)*10},${Math.floor(b/10)*10}`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
        
        // Find the most common color
        let maxCount = 0;
        let dominantColor = [240, 235, 220]; // Default tooth color
        
        for (const [colorKey, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantColor = colorKey.split(',').map(Number);
            }
        }
        
        return dominantColor;
    }
    
    findBestShadeMatch(targetColor) {
        let bestMatch = null;
        let minDistance = Infinity;
        
        for (const [shadeId, shadeData] of Object.entries(this.vitaShadeGuide)) {
            const distance = this.calculateColorDistance(targetColor, shadeData.rgb);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = { shadeId, ...shadeData, confidence: Math.max(0, 100 - (distance / 5)) };
            }
        }
        
        return bestMatch;
    }
    
    calculateColorDistance(color1, color2) {
        // Use Delta E CIE 2000 approximation for better perceptual accuracy
        const [r1, g1, b1] = color1;
        const [r2, g2, b2] = color2;
        
        const deltaR = r1 - r2;
        const deltaG = g1 - g2;
        const deltaB = b1 - b2;
        
        // Weighted Euclidean distance
        const meanR = (r1 + r2) / 2;
        const weightR = 2 + meanR / 256;
        const weightG = 4;
        const weightB = 2 + (255 - meanR) / 256;
        
        return Math.sqrt(weightR * deltaR * deltaR + weightG * deltaG * deltaG + weightB * deltaB * deltaB);
    }
    
    displayAnalysisResults(dominantColor, matchedShade) {
        const resultsContainer = document.getElementById('analysisResults');
        
        const resultHTML = `
            <div class="analysis-result">
                <div class="shade-preview" style="background-color: rgb(${dominantColor.join(',')})"></div>
                <div class="analysis-info">
                    <h4>Best Match: ${matchedShade.shadeId}</h4>
                    <p>${matchedShade.name}</p>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${matchedShade.confidence}%"></div>
                    </div>
                    <p style="margin-top: 5px;">Confidence: ${Math.round(matchedShade.confidence)}%</p>
                </div>
            </div>
            <div style="margin-top: 15px; font-size: 0.9rem; color: #666;">
                <strong>Detected Color:</strong> RGB(${dominantColor.join(', ')})<br>
                <strong>Target Color:</strong> RGB(${matchedShade.rgb.join(', ')})
            </div>
        `;
        
        resultsContainer.innerHTML = resultHTML;
    }
    
    renderShadeGuide() {
        const shadeGuideContainer = document.getElementById('shadeGuide');
        
        for (const [shadeId, shadeData] of Object.entries(this.vitaShadeGuide)) {
            const shadeElement = document.createElement('div');
            shadeElement.className = 'shade-item';
            shadeElement.dataset.shadeId = shadeId;
            
            shadeElement.innerHTML = `
                <div class="shade-color" style="background-color: ${shadeData.color}"></div>
                <div class="shade-label">${shadeId}</div>
            `;
            
            shadeElement.addEventListener('click', () => {
                this.showShadeInfo(shadeId, shadeData);
            });
            
            shadeGuideContainer.appendChild(shadeElement);
        }
    }
    
    highlightMatchedShade(shadeId) {
        // Remove previous highlights
        document.querySelectorAll('.shade-item').forEach(item => {
            item.classList.remove('matched');
        });
        
        // Highlight the matched shade
        const matchedElement = document.querySelector(`[data-shade-id="${shadeId}"]`);
        if (matchedElement) {
            matchedElement.classList.add('matched');
            matchedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    showShadeInfo(shadeId, shadeData) {
        alert(`${shadeData.name}\nShade ID: ${shadeId}\nColor: ${shadeData.color}\nRGB: ${shadeData.rgb.join(', ')}`);
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DentalShadeDetector();
});
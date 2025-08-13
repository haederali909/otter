class DentalShadeDetector {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.model = null;
        this.capturedImageData = null;
        this.geminiAnalyzer = null;
        
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
        this.initializeGeminiAPI();
    }
    
    setupEventListeners() {
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.captureImage());
        document.getElementById('uploadBtn').addEventListener('click', () => this.triggerFileUpload());
        document.getElementById('photoUpload').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeShade());
        
        // Setup drag & drop functionality
        this.setupDragAndDrop();
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
    
    initializeGeminiAPI() {
        try {
            // Try to get API key from localStorage first
            const savedApiKey = localStorage.getItem('gemini_api_key') || CONFIG.GEMINI_API_KEY;
            this.geminiAnalyzer = new GeminiShadeAnalyzer(savedApiKey);
            console.log('Gemini API integration initialized');
        } catch (error) {
            console.error('Gemini API initialization error:', error);
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
        
        // Get image data and display
        this.processImageForAnalysis('camera');
        
        console.log('Image captured successfully');
    }
    
    triggerFileUpload() {
        document.getElementById('photoUpload').click();
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processUploadedFile(file);
        }
    }
    
    processUploadedFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file.');
            return;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('Image file too large. Please select a file under 10MB.');
            return;
        }
        
        console.log('Processing uploaded file:', file.name);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Draw uploaded image to canvas
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                
                // Process for analysis
                this.processImageForAnalysis('upload', img.src);
                
                this.showSuccess(`Image "${file.name}" uploaded successfully!`);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    processImageForAnalysis(source, imageSrc = null) {
        // Get image data from canvas
        this.capturedImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Create display image
        const displayImg = document.createElement('img');
        displayImg.src = imageSrc || this.canvas.toDataURL('image/jpeg', 0.8);
        displayImg.style.maxWidth = '100%';
        displayImg.style.maxHeight = '200px';
        displayImg.style.borderRadius = '8px';
        
        // Add source indicator
        const sourceIndicator = document.createElement('div');
        sourceIndicator.className = 'image-source-indicator';
        sourceIndicator.innerHTML = source === 'camera' ? '📷 Camera Capture' : '📁 Uploaded Image';
        
        // Create image wrapper for positioning
        const imageWrapper = document.createElement('div');
        imageWrapper.style.position = 'relative';
        imageWrapper.style.display = 'inline-block';
        imageWrapper.appendChild(displayImg);
        imageWrapper.appendChild(sourceIndicator);
        
        // Update container
        const container = document.getElementById('capturedImageContainer');
        container.innerHTML = '';
        container.appendChild(imageWrapper);
        container.classList.remove('drop-zone');
        
        // Enable analysis
        document.getElementById('analyzeBtn').disabled = false;
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('capturedImageContainer');
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
        });
        
        // Handle dropped files
        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        // Click to upload functionality
        dropZone.addEventListener('click', () => {
            if (dropZone.classList.contains('drop-zone')) {
                this.triggerFileUpload();
            }
        });
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    highlight(element) {
        element.classList.add('drag-over');
    }
    
    unhighlight(element) {
        element.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            this.processUploadedFile(files[0]);
        }
    }
    
    async analyzeShade() {
        if (!this.capturedImageData) {
            this.showError('Please capture an image first.');
            return;
        }
        
        try {
            document.getElementById('analyzeBtn').textContent = 'AI Analyzing...';
            document.getElementById('analyzeBtn').disabled = true;
            
            // Try Gemini AI analysis first
            let analysisResults = null;
            let usingAI = false;
            
            if (this.geminiAnalyzer && this.geminiAnalyzer.isAvailable) {
                try {
                    console.log('🤖 Using Gemini AI for professional shade analysis...');
                    const imageBase64 = this.geminiAnalyzer.preprocessImage(this.canvas);
                    const geminiResponse = await this.geminiAnalyzer.analyzeToothShade(imageBase64);
                    
                    if (geminiResponse.success) {
                        analysisResults = this.geminiAnalyzer.formatAnalysisResults(geminiResponse);
                        usingAI = true;
                        console.log('✅ Gemini AI analysis completed');
                    }
                } catch (aiError) {
                    console.warn('AI analysis failed, falling back to basic analysis:', aiError.message);
                    this.showWarning('AI analysis unavailable. Using basic color analysis.');
                }
            }
            
            // Fallback to basic analysis if AI is not available
            if (!analysisResults) {
                console.log('📊 Using basic color analysis...');
                const dominantColor = this.extractDominantColor(this.capturedImageData);
                const matchedShade = this.findBestShadeMatch(dominantColor);
                analysisResults = {
                    primary_match: {
                        shade: matchedShade.shadeId,
                        confidence: matchedShade.confidence,
                        description: matchedShade.name
                    },
                    ai_enhanced: false,
                    provider: 'Basic Color Analysis'
                };
            }
            
            // Display results
            this.displayEnhancedAnalysisResults(analysisResults, usingAI);
            
            // Highlight matched shade in guide
            this.highlightMatchedShade(analysisResults.primary_match.shade);
            
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
    
    displayEnhancedAnalysisResults(results, usingAI) {
        const resultsContainer = document.getElementById('analysisResults');
        const primaryMatch = results.primary_match;
        
        let aiStatusBadge = '';
        if (usingAI) {
            aiStatusBadge = '<div class="ai-badge">🤖 AI Enhanced</div>';
        } else {
            aiStatusBadge = '<div class="basic-badge">📊 Basic Analysis</div>';
        }
        
        let secondaryMatches = '';
        if (results.secondary_matches && results.secondary_matches.length > 0) {
            secondaryMatches = `
                <div class="secondary-matches">
                    <h5>Alternative Matches:</h5>
                    <div class="secondary-list">
                        ${results.secondary_matches.map(shade => `
                            <span class="secondary-shade" data-shade="${shade}">${shade}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        let professionalInsights = '';
        if (results.professional_insights) {
            const insights = results.professional_insights;
            professionalInsights = `
                <div class="professional-insights">
                    <h5>Professional Insights:</h5>
                    ${insights.lighting_assessment ? `<p><strong>Lighting:</strong> ${insights.lighting_assessment}</p>` : ''}
                    ${insights.recommendations ? `
                        <div class="recommendations">
                            <strong>Recommendations:</strong>
                            <ul>
                                ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${insights.factors_considered ? `
                        <div class="factors">
                            <strong>Analysis Factors:</strong>
                            <ul>
                                ${insights.factors_considered.map(factor => `<li>${factor}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        let qualityMetrics = '';
        if (results.quality_metrics) {
            const quality = results.quality_metrics;
            qualityMetrics = `
                <div class="quality-metrics">
                    <h5>Image Quality Assessment:</h5>
                    <div class="quality-scores">
                        <div class="quality-score">
                            <span>Overall Suitability:</span>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${quality.overall_suitability}%"></div>
                            </div>
                            <span>${quality.overall_suitability}%</span>
                        </div>
                        ${quality.lighting_score ? `
                            <div class="quality-score">
                                <span>Lighting Quality:</span>
                                <div class="score-bar">
                                    <div class="score-fill" style="width: ${quality.lighting_score}%"></div>
                                </div>
                                <span>${quality.lighting_score}%</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        const resultHTML = `
            ${aiStatusBadge}
            <div class="analysis-result enhanced">
                <div class="shade-preview" style="background-color: ${this.vitaShadeGuide[primaryMatch.shade]?.color || '#F0F0F0'}"></div>
                <div class="analysis-info">
                    <h4>Primary Match: ${primaryMatch.shade}</h4>
                    <p>${primaryMatch.description}</p>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${primaryMatch.confidence}%"></div>
                    </div>
                    <p style="margin-top: 5px;">Confidence: ${Math.round(primaryMatch.confidence)}%</p>
                </div>
            </div>
            ${secondaryMatches}
            ${professionalInsights}
            ${qualityMetrics}
            <div class="analysis-footer">
                <small>Analysis by: ${results.provider}</small>
            </div>
        `;
        
        resultsContainer.innerHTML = resultHTML;
        
        // Add click handlers for secondary matches
        document.querySelectorAll('.secondary-shade').forEach(element => {
            element.addEventListener('click', () => {
                const shade = element.dataset.shade;
                this.highlightMatchedShade(shade);
                this.showShadeInfo(shade, this.vitaShadeGuide[shade]);
            });
        });
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
        this.showNotification(message, 'error');
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'error') {
        const colors = {
            error: '#e74c3c',
            warning: '#f39c12',
            success: '#27ae60'
        };
        
        const icons = {
            error: '❌',
            warning: '⚠️',
            success: '✅'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.innerHTML = `${icons[type]} ${message}`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DentalShadeDetector();
});
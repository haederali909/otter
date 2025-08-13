/**
 * Gemini API Integration for Dental Shade Detection
 * Advanced AI-powered tooth shade analysis using Google's Gemini Vision API
 */

class GeminiShadeAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.endpoint = CONFIG.GEMINI_API_ENDPOINT;
        this.isAvailable = false;
        this.initializeAPI();
    }

    async initializeAPI() {
        if (!this.apiKey || this.apiKey === 'YOUR_API_KEY') {
            console.warn('Gemini API key not configured. Using fallback analysis.');
            this.showAPIKeyPrompt();
            return;
        }
        
        try {
            // Test API connectivity
            await this.testAPIConnection();
            this.isAvailable = true;
            console.log('✅ Gemini API initialized successfully');
        } catch (error) {
            console.error('❌ Gemini API initialization failed:', error);
            this.isAvailable = false;
        }
    }

    showAPIKeyPrompt() {
        const apiKeyModal = document.createElement('div');
        apiKeyModal.className = 'api-key-modal';
        apiKeyModal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <h3>🔑 Gemini API Key Required</h3>
                    <p>To enable advanced AI shade detection, please provide your Gemini API key:</p>
                    <ol>
                        <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
                        <li>Create a new API key</li>
                        <li>Enter it below for enhanced analysis</li>
                    </ol>
                    <input type="password" id="geminiApiKey" placeholder="Enter your Gemini API key" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
                    <div class="modal-buttons">
                        <button id="saveApiKey" class="btn btn-primary">Save & Enable AI</button>
                        <button id="useFallback" class="btn btn-secondary">Use Basic Analysis</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(apiKeyModal);

        // Event handlers
        document.getElementById('saveApiKey').addEventListener('click', () => {
            const apiKey = document.getElementById('geminiApiKey').value.trim();
            if (apiKey) {
                this.apiKey = apiKey;
                localStorage.setItem('gemini_api_key', apiKey);
                this.initializeAPI();
                apiKeyModal.remove();
            }
        });

        document.getElementById('useFallback').addEventListener('click', () => {
            apiKeyModal.remove();
        });
    }

    async testAPIConnection() {
        const testPayload = {
            contents: [{
                parts: [{
                    text: "Test connection. Respond with: {\"status\": \"connected\"}"
                }]
            }]
        };

        const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });

        if (!response.ok) {
            throw new Error(`API test failed: ${response.status}`);
        }
    }

    async analyzeToothShade(imageBase64) {
        if (!this.isAvailable) {
            throw new Error('Gemini API not available. Please configure your API key.');
        }

        try {
            // First, check image quality
            const qualityCheck = await this.checkImageQuality(imageBase64);
            
            if (qualityCheck.overall_suitability < CONFIG.ANALYSIS_SETTINGS.QUALITY_THRESHOLD) {
                return {
                    success: false,
                    error: 'Image quality insufficient for accurate analysis',
                    quality_check: qualityCheck,
                    suggestions: qualityCheck.recommendations
                };
            }

            // Perform detailed shade analysis
            const shadeAnalysis = await this.performShadeAnalysis(imageBase64);
            
            return {
                success: true,
                analysis: shadeAnalysis,
                quality_check: qualityCheck,
                ai_provider: 'Gemini Vision API',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Gemini analysis error:', error);
            throw new Error(`AI analysis failed: ${error.message}`);
        }
    }

    async checkImageQuality(imageBase64) {
        const payload = {
            contents: [{
                parts: [
                    {
                        text: CONFIG.DENTAL_PROMPTS.QUALITY_CHECK
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: imageBase64
                        }
                    }
                ]
            }]
        };

        const response = await this.makeAPIRequest(payload);
        return this.parseJSONResponse(response, 'quality check');
    }

    async performShadeAnalysis(imageBase64) {
        const payload = {
            contents: [{
                parts: [
                    {
                        text: CONFIG.DENTAL_PROMPTS.SHADE_ANALYSIS
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: imageBase64
                        }
                    }
                ]
            }]
        };

        const response = await this.makeAPIRequest(payload);
        return this.parseJSONResponse(response, 'shade analysis');
    }

    async makeAPIRequest(payload, retryCount = 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.ANALYSIS_SETTINGS.TIMEOUT);

            const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            return await response.json();

        } catch (error) {
            if (retryCount < CONFIG.ANALYSIS_SETTINGS.MAX_RETRIES) {
                console.log(`Retrying API request (${retryCount + 1}/${CONFIG.ANALYSIS_SETTINGS.MAX_RETRIES})`);
                await this.delay(1000 * (retryCount + 1)); // Exponential backoff
                return this.makeAPIRequest(payload, retryCount + 1);
            }
            throw error;
        }
    }

    parseJSONResponse(response, context) {
        try {
            const content = response.candidates[0].content.parts[0].text;
            
            // Clean the response (remove markdown formatting if present)
            const jsonText = content.replace(/```json\n?|\n?```/g, '').trim();
            
            const parsed = JSON.parse(jsonText);
            console.log(`✅ ${context} completed:`, parsed);
            return parsed;

        } catch (error) {
            console.error(`❌ Failed to parse ${context} response:`, error);
            console.log('Raw response:', response);
            throw new Error(`Invalid JSON response from AI for ${context}`);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Image preprocessing for optimal API performance
    preprocessImage(canvas) {
        const maxSize = CONFIG.ANALYSIS_SETTINGS.IMAGE_MAX_SIZE;
        const { width, height } = canvas;
        
        if (width <= maxSize && height <= maxSize) {
            return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        }

        // Resize image if too large
        const scale = Math.min(maxSize / width, maxSize / height);
        const newWidth = Math.floor(width * scale);
        const newHeight = Math.floor(height * scale);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;

        tempCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        return tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    }

    // Enhanced results formatting for UI display
    formatAnalysisResults(geminiResponse) {
        const analysis = geminiResponse.analysis;
        
        return {
            primary_match: {
                shade: analysis.primary_shade,
                confidence: analysis.confidence,
                description: analysis.color_description
            },
            secondary_matches: analysis.secondary_matches || [],
            professional_insights: {
                lighting_assessment: analysis.lighting_quality,
                recommendations: analysis.recommendations,
                factors_considered: analysis.factors_considered
            },
            quality_metrics: geminiResponse.quality_check,
            ai_enhanced: true,
            provider: 'Google Gemini Vision API'
        };
    }
}

// Enhanced error handling and user feedback
class AIAnalysisError extends Error {
    constructor(message, type = 'GENERAL', details = null) {
        super(message);
        this.name = 'AIAnalysisError';
        this.type = type;
        this.details = details;
    }
}
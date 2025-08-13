// Configuration for Gemini API integration
const CONFIG = {
    // API Configuration
    GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    
    // You need to get your API key from https://makersuite.google.com/app/apikey
    // Replace 'YOUR_API_KEY' with your actual Gemini API key
    GEMINI_API_KEY: 'YOUR_API_KEY', // ⚠️ Replace with your actual API key
    
    // Dental shade detection prompts
    DENTAL_PROMPTS: {
        SHADE_ANALYSIS: `You are a professional dental shade matching expert with extensive knowledge of the VITA shade guide system. 
        
Analyze this tooth image and provide accurate shade matching based on:

1. **Color Analysis**: Examine the overall color, hue, chroma, and value of the tooth
2. **VITA Shade Matching**: Match against standard VITA shades (A1-A4, B1-B4, C1-C4, D2-D4)
3. **Lighting Assessment**: Consider lighting conditions and their impact on color perception
4. **Dental Factors**: Account for translucency, surface texture, and age-related changes

**VITA Shade Guide Reference:**
- A Series (Reddish Brown): A1 (lightest) → A4 (darkest)
- B Series (Reddish Yellow): B1 (lightest) → B4 (darkest) 
- C Series (Gray): C1 (lightest) → C4 (darkest)
- D Series (Reddish Gray): D2 → D4 (darkest)

**Required Response Format (JSON only):**
{
    "primary_shade": "A2",
    "confidence": 85,
    "secondary_matches": ["A3", "B2"],
    "color_description": "Light reddish brown with warm undertones",
    "lighting_quality": "Good natural lighting",
    "recommendations": [
        "Consider A2 as primary match",
        "Check under different lighting conditions",
        "Compare with adjacent teeth for consistency"
    ],
    "factors_considered": [
        "Hue analysis shows reddish-brown dominance",
        "Chroma indicates moderate saturation",
        "Value suggests light to medium brightness"
    ]
}

Respond ONLY with valid JSON. No additional text.`,

        QUALITY_CHECK: `Assess the quality of this dental image for shade matching purposes.

Evaluate:
1. **Image Quality**: Resolution, focus, clarity
2. **Lighting Conditions**: Color temperature, shadows, uniformity
3. **Tooth Visibility**: Clear view of tooth surface, no obstructions
4. **Color Accuracy**: Potential for accurate shade assessment

**Response Format (JSON only):**
{
    "image_quality": "excellent|good|fair|poor",
    "lighting_score": 85,
    "visibility_score": 90,
    "overall_suitability": 88,
    "issues": ["slight shadow on left side"],
    "recommendations": ["Improve lighting from front angle"]
}

Respond ONLY with valid JSON.`
    },
    
    // Analysis settings
    ANALYSIS_SETTINGS: {
        MAX_RETRIES: 3,
        TIMEOUT: 30000, // 30 seconds
        IMAGE_MAX_SIZE: 1024, // Max width/height for API
        QUALITY_THRESHOLD: 70, // Minimum quality score to proceed
        CONFIDENCE_THRESHOLD: 60 // Minimum confidence for reliable results
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
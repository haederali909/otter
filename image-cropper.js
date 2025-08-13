/**
 * Advanced Image Cropping Module with AI Teeth Detection
 * Provides manual and automatic cropping capabilities for uploaded photos
 */

class ImageCropper {
    constructor(teethDetector, geminiAnalyzer) {
        this.teethDetector = teethDetector;
        this.geminiAnalyzer = geminiAnalyzer;
        
        // Canvas elements
        this.croppingCanvas = document.getElementById('croppingCanvas');
        this.croppingCtx = this.croppingCanvas.getContext('2d');
        
        // UI elements
        this.croppingInterface = document.getElementById('croppingInterface');
        this.cropOverlay = document.getElementById('cropOverlay');
        this.cropSelection = document.getElementById('cropSelection');
        this.statusText = document.getElementById('croppingStatusText');
        
        // Cropping state
        this.isActive = false;
        this.originalImage = null;
        this.cropArea = { x: 0, y: 0, width: 100, height: 100 };
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentHandle = null;
        
        // Auto-detection state
        this.detectedRegions = [];
        this.autoDetectionInProgress = false;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Cropping controls
        document.getElementById('autoDetectBtn').addEventListener('click', () => this.autoDetectTeeth());
        document.getElementById('resetCropBtn').addEventListener('click', () => this.resetCrop());
        document.getElementById('applyCropBtn').addEventListener('click', () => this.applyCrop());
        document.getElementById('cancelCropBtn').addEventListener('click', () => this.cancelCrop());
        
        // Mouse events for manual cropping
        this.cropSelection.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Touch events for mobile
        this.cropSelection.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        document.addEventListener('touchmove', (e) => this.handleMouseMove(e.touches[0]));
        document.addEventListener('touchend', () => this.endDrag());
        
        // Handle resize controls
        this.setupResizeHandles();
    }
    
    setupResizeHandles() {
        const handles = this.cropSelection.querySelectorAll('.crop-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResize(e, handle.className);
            });
            
            handle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                this.startResize(e.touches[0], handle.className);
            });
        });
    }
    
    startCropping(image) {
        this.originalImage = image;
        this.isActive = true;
        
        // Setup canvas
        this.setupCanvas(image);
        
        // Show interface
        this.croppingInterface.style.display = 'block';
        
        // Initialize crop area (center 60% of image)
        this.initializeCropArea();
        
        // Update status
        this.updateStatus('🎯 Drag to select teeth area or use auto-detect');
        
        console.log('🖼️ Image cropping started');
    }
    
    setupCanvas(image) {
        // Calculate display size while maintaining aspect ratio
        const maxWidth = 600;
        const maxHeight = 400;
        
        let { width, height } = image;
        const aspectRatio = width / height;
        
        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        // Set canvas size
        this.croppingCanvas.width = width;
        this.croppingCanvas.height = height;
        
        // Draw image
        this.croppingCtx.drawImage(image, 0, 0, width, height);
        
        // Store scale factors for coordinate conversion
        this.scaleX = image.width / width;
        this.scaleY = image.height / height;
    }
    
    initializeCropArea() {
        const canvasRect = this.croppingCanvas.getBoundingClientRect();
        const overlayRect = this.cropOverlay.getBoundingClientRect();
        
        // Calculate relative positioning
        const offsetX = canvasRect.left - overlayRect.left;
        const offsetY = canvasRect.top - overlayRect.top;
        
        // Set initial crop area (center 60% of canvas)
        const width = this.croppingCanvas.width * 0.6;
        const height = this.croppingCanvas.height * 0.6;
        const x = (this.croppingCanvas.width - width) / 2;
        const y = (this.croppingCanvas.height - height) / 2;
        
        this.cropArea = { x, y, width, height };
        this.updateCropSelection(offsetX, offsetY);
    }
    
    updateCropSelection(offsetX = 0, offsetY = 0) {
        const selection = this.cropSelection;
        
        selection.style.left = `${this.cropArea.x + offsetX}px`;
        selection.style.top = `${this.cropArea.y + offsetY}px`;
        selection.style.width = `${this.cropArea.width}px`;
        selection.style.height = `${this.cropArea.height}px`;
    }
    
    async autoDetectTeeth() {
        if (this.autoDetectionInProgress) return;
        
        this.autoDetectionInProgress = true;
        this.updateStatus('🤖 AI detecting teeth regions...');
        
        try {
            // Create temporary canvas with original image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.originalImage.width;
            tempCanvas.height = this.originalImage.height;
            tempCtx.drawImage(this.originalImage, 0, 0);
            
            let detectedRegions = [];
            
            // Try Gemini AI detection first
            if (this.geminiAnalyzer && this.geminiAnalyzer.isAvailable) {
                detectedRegions = await this.detectWithGemini(tempCanvas);
            }
            
            // Fallback to basic computer vision
            if (detectedRegions.length === 0) {
                detectedRegions = this.detectWithBasicCV(tempCanvas);
            }
            
            if (detectedRegions.length > 0) {
                // Use the largest/most confident detection
                const bestRegion = this.selectBestRegion(detectedRegions);
                this.applyCropRegion(bestRegion);
                this.updateStatus(`✅ Found ${detectedRegions.length} teeth region(s) - using best match`);
            } else {
                this.updateStatus('❌ No teeth detected - try manual selection');
            }
            
        } catch (error) {
            console.error('Auto-detection error:', error);
            this.updateStatus('❌ Auto-detection failed - try manual selection');
        } finally {
            this.autoDetectionInProgress = false;
        }
    }
    
    async detectWithGemini(canvas) {
        try {
            const imageBase64 = this.geminiAnalyzer.preprocessImage(canvas);
            
            const detectionPrompt = `Analyze this image and detect teeth regions. Respond with JSON only:
            {
                "teeth_regions": [
                    {
                        "x": 100,
                        "y": 50,
                        "width": 200,
                        "height": 150,
                        "confidence": 0.85,
                        "description": "main teeth area"
                    }
                ],
                "total_regions": 1,
                "best_region_index": 0
            }
            
            Provide coordinates in pixels relative to image size (${canvas.width}x${canvas.height}).`;
            
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
                
                console.log('🤖 Gemini teeth detection:', detection);
                return detection.teeth_regions || [];
            }
        } catch (error) {
            console.warn('Gemini detection failed:', error);
        }
        
        return [];
    }
    
    detectWithBasicCV(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const regions = [];
        const blockSize = 30;
        const minRegionSize = 100;
        
        // Analyze image in blocks for teeth-like colors
        for (let y = 0; y < canvas.height - blockSize; y += blockSize) {
            for (let x = 0; x < canvas.width - blockSize; x += blockSize) {
                const toothLikelihood = this.analyzeBlockForTeeth(data, x, y, blockSize, canvas.width);
                
                if (toothLikelihood > 0.6) {
                    regions.push({
                        x: x,
                        y: y,
                        width: blockSize,
                        height: blockSize,
                        confidence: toothLikelihood
                    });
                }
            }
        }
        
        // Merge nearby regions
        return this.mergeRegions(regions, minRegionSize);
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
                    
                    // Count tooth-like pixels
                    if (brightness > 160 && Math.abs(r - g) < 40 && Math.abs(g - b) < 40) {
                        whitePixels++;
                    }
                }
            }
        }
        
        if (totalPixels === 0) return 0;
        
        const avgBrightness = totalBrightness / totalPixels;
        const whiteRatio = whitePixels / totalPixels;
        
        // Teeth detection scoring
        let score = 0;
        
        if (avgBrightness > 140 && avgBrightness < 250) {
            score += 0.4;
        }
        
        score += whiteRatio * 0.6;
        
        return Math.min(score, 1.0);
    }
    
    mergeRegions(regions, minSize) {
        if (regions.length === 0) return [];
        
        const merged = [];
        const used = new Set();
        
        for (let i = 0; i < regions.length; i++) {
            if (used.has(i)) continue;
            
            let group = [regions[i]];
            used.add(i);
            
            for (let j = i + 1; j < regions.length; j++) {
                if (used.has(j)) continue;
                
                if (this.regionsOverlap(regions[i], regions[j], 50)) {
                    group.push(regions[j]);
                    used.add(j);
                }
            }
            
            const bounds = this.calculateGroupBounds(group);
            if (bounds.width >= minSize && bounds.height >= minSize) {
                merged.push({
                    ...bounds,
                    confidence: group.reduce((sum, r) => sum + r.confidence, 0) / group.length
                });
            }
        }
        
        return merged.sort((a, b) => b.confidence - a.confidence);
    }
    
    regionsOverlap(r1, r2, threshold) {
        const centerX1 = r1.x + r1.width / 2;
        const centerY1 = r1.y + r1.height / 2;
        const centerX2 = r2.x + r2.width / 2;
        const centerY2 = r2.y + r2.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2)
        );
        
        return distance < threshold;
    }
    
    calculateGroupBounds(group) {
        const minX = Math.min(...group.map(r => r.x));
        const minY = Math.min(...group.map(r => r.y));
        const maxX = Math.max(...group.map(r => r.x + r.width));
        const maxY = Math.max(...group.map(r => r.y + r.height));
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    selectBestRegion(regions) {
        if (regions.length === 0) return null;
        
        // Score regions based on confidence, size, and position
        return regions.reduce((best, region) => {
            const sizeScore = Math.min(region.width * region.height / 10000, 1);
            const centerScore = this.calculateCenterScore(region);
            const totalScore = region.confidence * 0.5 + sizeScore * 0.3 + centerScore * 0.2;
            
            return totalScore > (best.totalScore || 0) ? { ...region, totalScore } : best;
        }, {});
    }
    
    calculateCenterScore(region) {
        const centerX = region.x + region.width / 2;
        const centerY = region.y + region.height / 2;
        const imageCenterX = this.originalImage.width / 2;
        const imageCenterY = this.originalImage.height / 2;
        
        const distanceFromCenter = Math.sqrt(
            Math.pow(centerX - imageCenterX, 2) + Math.pow(centerY - imageCenterY, 2)
        );
        
        const maxDistance = Math.sqrt(
            Math.pow(imageCenterX, 2) + Math.pow(imageCenterY, 2)
        );
        
        return 1 - (distanceFromCenter / maxDistance);
    }
    
    applyCropRegion(region) {
        if (!region) return;
        
        // Convert original image coordinates to canvas coordinates
        const x = region.x / this.scaleX;
        const y = region.y / this.scaleY;
        const width = region.width / this.scaleX;
        const height = region.height / this.scaleY;
        
        // Ensure crop area is within canvas bounds
        this.cropArea = {
            x: Math.max(0, Math.min(x, this.croppingCanvas.width - 50)),
            y: Math.max(0, Math.min(y, this.croppingCanvas.height - 50)),
            width: Math.max(50, Math.min(width, this.croppingCanvas.width - x)),
            height: Math.max(50, Math.min(height, this.croppingCanvas.height - y))
        };
        
        this.updateCropSelection();
    }
    
    startDrag(e) {
        this.isDragging = true;
        const rect = this.cropSelection.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        e.preventDefault();
    }
    
    startResize(e, handleClass) {
        this.isResizing = true;
        this.currentHandle = handleClass;
        const rect = this.cropSelection.getBoundingClientRect();
        this.dragStart = {
            x: e.clientX,
            y: e.clientY,
            cropX: this.cropArea.x,
            cropY: this.cropArea.y,
            cropWidth: this.cropArea.width,
            cropHeight: this.cropArea.height
        };
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (this.isDragging) {
            this.handleDrag(e);
        } else if (this.isResizing) {
            this.handleResize(e);
        }
    }
    
    handleDrag(e) {
        const overlayRect = this.cropOverlay.getBoundingClientRect();
        const canvasRect = this.croppingCanvas.getBoundingClientRect();
        
        const newX = e.clientX - overlayRect.left - this.dragStart.x;
        const newY = e.clientY - overlayRect.top - this.dragStart.y;
        
        // Keep within canvas bounds
        const maxX = this.croppingCanvas.width - this.cropArea.width;
        const maxY = this.croppingCanvas.height - this.cropArea.height;
        
        this.cropArea.x = Math.max(0, Math.min(newX - (canvasRect.left - overlayRect.left), maxX));
        this.cropArea.y = Math.max(0, Math.min(newY - (canvasRect.top - overlayRect.top), maxY));
        
        this.updateCropSelection();
    }
    
    handleResize(e) {
        const deltaX = e.clientX - this.dragStart.x;
        const deltaY = e.clientY - this.dragStart.y;
        
        const minSize = 50;
        const maxX = this.croppingCanvas.width;
        const maxY = this.croppingCanvas.height;
        
        if (this.currentHandle.includes('right')) {
            this.cropArea.width = Math.max(minSize, Math.min(this.dragStart.cropWidth + deltaX, maxX - this.cropArea.x));
        }
        if (this.currentHandle.includes('left')) {
            const newWidth = this.dragStart.cropWidth - deltaX;
            const newX = this.dragStart.cropX + deltaX;
            if (newWidth >= minSize && newX >= 0) {
                this.cropArea.width = newWidth;
                this.cropArea.x = newX;
            }
        }
        if (this.currentHandle.includes('bottom')) {
            this.cropArea.height = Math.max(minSize, Math.min(this.dragStart.cropHeight + deltaY, maxY - this.cropArea.y));
        }
        if (this.currentHandle.includes('top')) {
            const newHeight = this.dragStart.cropHeight - deltaY;
            const newY = this.dragStart.cropY + deltaY;
            if (newHeight >= minSize && newY >= 0) {
                this.cropArea.height = newHeight;
                this.cropArea.y = newY;
            }
        }
        
        this.updateCropSelection();
    }
    
    endDrag() {
        this.isDragging = false;
        this.isResizing = false;
        this.currentHandle = null;
    }
    
    resetCrop() {
        this.initializeCropArea();
        this.updateStatus('🔄 Crop area reset to default');
    }
    
    applyCrop() {
        if (!this.originalImage) return;
        
        // Calculate crop coordinates in original image space
        const cropX = this.cropArea.x * this.scaleX;
        const cropY = this.cropArea.y * this.scaleY;
        const cropWidth = this.cropArea.width * this.scaleX;
        const cropHeight = this.cropArea.height * this.scaleY;
        
        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        
        // Draw cropped image
        croppedCtx.drawImage(
            this.originalImage,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );
        
        // Trigger crop complete event
        const event = new CustomEvent('cropComplete', {
            detail: {
                croppedCanvas: croppedCanvas,
                cropArea: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
                originalImage: this.originalImage
            }
        });
        
        document.dispatchEvent(event);
        this.closeCropping();
        
        console.log('✅ Image cropped successfully');
    }
    
    cancelCrop() {
        this.closeCropping();
        console.log('❌ Image cropping cancelled');
    }
    
    closeCropping() {
        this.isActive = false;
        this.croppingInterface.style.display = 'none';
        this.originalImage = null;
        this.detectedRegions = [];
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
    }
}
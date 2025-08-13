# 🦷 Dental Shade Guide Detection with AI

A web-based application that uses AI and computer vision to detect and match tooth shades using your device's camera. The application analyzes captured images and matches them against the VITA shade guide standard used in dentistry.

## Features

- **Real-time Camera Access**: Use your device's camera to capture tooth images
- **AI-Powered Analysis**: Uses TensorFlow.js and computer vision algorithms for color analysis
- **VITA Shade Guide Matching**: Compares captured colors against the standard VITA shade guide
- **Professional UI**: Clean, modern interface designed for dental professionals
- **Color Analysis**: Advanced color matching using perceptual color distance algorithms
- **Confidence Scoring**: Provides confidence levels for shade matches
- **Mobile Responsive**: Works on desktop and mobile devices

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI/ML**: TensorFlow.js, MobileNet
- **Computer Vision**: Canvas API for image processing
- **Camera**: WebRTC getUserMedia API
- **Color Science**: Delta E color distance calculations

## How to Use

1. **Start the Application**
   - Open `index.html` in a modern web browser
   - Ensure you have camera permissions enabled

2. **Capture Tooth Images**
   - Click "Start Camera" to access your device's camera
   - Position the tooth in good lighting conditions
   - Click "Capture Image" to take a photo

3. **Analyze Shade**
   - Click "Analyze Shade" to process the captured image
   - View the matched shade from the VITA guide
   - Check the confidence level of the match

4. **Review Results**
   - See the detected color and matched shade
   - Browse the complete VITA shade guide reference
   - Click on shade samples for detailed information

## VITA Shade Guide Reference

The application includes the complete VITA shade guide with 16 standard shades:

### A Series (Reddish Brown)
- A1 - Light Reddish Brown
- A2 - Reddish Brown  
- A3 - Dark Reddish Brown
- A3.5 - Dark Reddish Brown
- A4 - Dark Reddish Brown

### B Series (Reddish Yellow)
- B1 - Light Reddish Yellow
- B2 - Reddish Yellow
- B3 - Dark Reddish Yellow
- B4 - Dark Reddish Yellow

### C Series (Gray)
- C1 - Light Gray
- C2 - Gray
- C3 - Dark Gray
- C4 - Dark Gray

### D Series (Reddish Gray)
- D2 - Reddish Gray
- D3 - Dark Reddish Gray
- D4 - Dark Reddish Gray

## Technical Implementation

### Color Analysis Algorithm
1. **Image Capture**: Uses Canvas API to capture video frames
2. **Color Sampling**: Analyzes pixel data to find dominant colors
3. **Filtering**: Removes extreme values (too dark/bright) to focus on tooth colors
4. **Color Matching**: Uses weighted Euclidean distance in RGB space
5. **Confidence Calculation**: Based on color distance to provide match reliability

### AI Integration
- **TensorFlow.js**: Provides the foundation for machine learning capabilities
- **MobileNet**: Lightweight model for image analysis and preprocessing
- **Computer Vision**: Custom algorithms for dental-specific color analysis

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (iOS 11+)
- **Edge**: Full support

### Requirements
- Modern web browser with camera support
- HTTPS connection (required for camera access)
- JavaScript enabled

## Setup Instructions

1. **Local Development**
   ```bash
   # Clone or download the files
   # Serve using a local HTTP server (HTTPS required for camera)
   
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```

2. **Production Deployment**
   - Upload files to any web server
   - Ensure HTTPS is enabled for camera access
   - No additional dependencies required

## Limitations and Considerations

- **Lighting Conditions**: Results depend heavily on lighting quality
- **Camera Quality**: Higher resolution cameras provide better accuracy
- **Color Calibration**: Monitor/device color calibration affects results
- **Clinical Use**: This tool is for reference only, not clinical diagnosis
- **Privacy**: All processing is done client-side, no data is transmitted

## Future Enhancements

- Enhanced AI models trained specifically on dental images
- Support for custom shade guides
- Lighting condition detection and compensation
- Integration with dental practice management systems
- Advanced color calibration tools

## Disclaimer

This application is intended for educational and reference purposes only. It should not be used as the sole method for clinical shade selection. Always consult with dental professionals and use clinical judgment for patient care.

## License

This project is open source and available under the MIT License.
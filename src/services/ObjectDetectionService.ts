// src/services/ObjectDetectionService.ts
import * as tf from '@tensorflow/tfjs';

// Ensure TensorFlow.js is properly initialized
try {
  tf.setBackend('webgl').catch(() => {
    console.warn('WebGL backend failed, falling back to CPU');
    tf.setBackend('cpu');
  });
} catch (e) {
  console.warn('Error initializing TensorFlow.js backend:', e);
}

// Define types for detections and anomalies
export interface Detection {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export interface Anomaly {
  object: string;
  bbox: [number, number, number, number];
  score: number;
}

export interface AnomalyResult {
  hasAnomaly: boolean;
  anomalyScore: number;
  anomalies: Anomaly[];
}

// Mock object classes that we'll "detect"
const mockObjectClasses = [
  'person', 'bicycle', 'car', 'motorcycle', 'bus', 'truck',
  'traffic light', 'fire hydrant', 'stop sign', 'cat', 'dog'
];

class ObjectDetectionService {
  private isLoaded = false;
  private frameSkip = 2; // Process every 3rd frame by default
  private frameCount = 0;
  private processingFrame = false;
  private lastDetections: Detection[] = [];
  private lastAnomalyResult: AnomalyResult = { 
    hasAnomaly: false, 
    anomalyScore: 0, 
    anomalies: [] 
  };
  
  // Check if model is loaded
  public isModelLoaded(): boolean {
    return this.isLoaded;
  }

  // Set frame skip rate
  public setFrameSkip(skip: number): void {
    this.frameSkip = Math.max(0, skip);
    console.log(`Frame skip set to ${this.frameSkip} (processing every ${this.frameSkip + 1} frame)`);
  }

  // Load the mock model
  public async loadModel(): Promise<void> {
    try {
      console.log('Loading mock detection model...');
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Mock detection model loaded successfully');
      this.isLoaded = true;
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error loading model:', error);
      this.isLoaded = false;
      return Promise.reject(error);
    }
  }

  // Detect objects on video stream
  public detectObjectsOnVideo(
    videoElement: HTMLVideoElement,
    callback: (detections: Detection[], anomalyResult: AnomalyResult) => void,
    errorCallback?: (error: Error) => void
  ): void {
    if (!this.isLoaded) {
      const error = new Error('Model not loaded yet');
      console.error(error.message);
      if (errorCallback) errorCallback(error);
      return;
    }

    const detectFrame = async () => {
      // Skip frames based on frameSkip setting
      this.frameCount = (this.frameCount + 1) % (this.frameSkip + 1);
      
      // Only process when frameCount is 0 or we have no detections yet
      if ((this.frameCount === 0 || this.lastDetections.length === 0) && !this.processingFrame) {
        this.processingFrame = true;
        
        try {
          // Ensure video is valid
          if (videoElement.readyState < 2) {
            requestAnimationFrame(detectFrame);
            this.processingFrame = false;
            return;
          }
          
          // Generate mock detections
          const formattedDetections = this.generateMockDetections(videoElement);
          
          // Check for anomalies
          const anomalyResult = this.detectAnomalies(formattedDetections);
          
          // Store results
          this.lastDetections = formattedDetections;
          this.lastAnomalyResult = anomalyResult;
          
          // Send results to callback
          callback(formattedDetections, anomalyResult);
        } catch (error) {
          console.error('Error detecting objects:', error);
          if (errorCallback) errorCallback(error as Error);
        } finally {
          this.processingFrame = false;
        }
      } else if (this.lastDetections.length > 0) {
        // Use last results if we're skipping this frame but have previous results
        callback(this.lastDetections, this.lastAnomalyResult);
      }
      
      // Continue detection loop
      requestAnimationFrame(detectFrame);
    };

    // Start detection loop
    detectFrame();
  }
  
  // Generate mock detections based on video dimensions
  private generateMockDetections(videoElement: HTMLVideoElement): Detection[] {
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    
    if (!width || !height) {
      return [];
    }
    
    // Generate a random number of detections (1-5)
    const numDetections = Math.floor(Math.random() * 5) + 1;
    const detections: Detection[] = [];
    
    for (let i = 0; i < numDetections; i++) {
      // Generate random box dimensions
      const boxWidth = Math.floor(Math.random() * (width * 0.5)) + 50;
      const boxHeight = Math.floor(Math.random() * (height * 0.5)) + 50;
      
      // Generate random position
      const x = Math.floor(Math.random() * (width - boxWidth));
      const y = Math.floor(Math.random() * (height - boxHeight));
      
      // Select random class
      const classIndex = Math.floor(Math.random() * mockObjectClasses.length);
      const className = mockObjectClasses[classIndex];
      
      // Random confidence score between 0.6 and 1.0
      const score = 0.6 + (Math.random() * 0.4);
      
      detections.push({
        bbox: [x, y, boxWidth, boxHeight],
        class: className,
        score: score
      });
    }
    
    return detections;
  }

  // Simple anomaly detection based on unexpected objects or positions
  private detectAnomalies(detections: Detection[]): AnomalyResult {
    const anomalies: Anomaly[] = [];
    
    // Example: flag if more than 2 people detected
    const peopleCount = detections.filter(d => d.class === 'person').length;
    if (peopleCount > 2) {
      detections
        .filter(d => d.class === 'person')
        .forEach(detection => {
          // Only mark some as anomalies
          if (Math.random() > 0.5) {
            anomalies.push({
              object: detection.class,
              bbox: detection.bbox,
              score: 0.7 + (Math.random() * 0.3)
            });
          }
        });
    }
    
    // Example: flag any cars, trucks, or buses as anomalies
    detections
      .filter(d => ['car', 'truck', 'bus'].includes(d.class))
      .forEach(detection => {
        anomalies.push({
          object: detection.class,
          bbox: detection.bbox,
          score: 0.8 + (Math.random() * 0.2)
        });
      });
    
    // Example: randomly flag any low-confidence detections
    detections
      .filter(d => d.score < 0.7)
      .forEach(detection => {
        if (Math.random() > 0.7) {
          anomalies.push({
            object: detection.class,
            bbox: detection.bbox,
            score: 0.6 + (Math.random() * 0.2)
          });
        }
      });
    
    // Calculate overall anomaly score
    const anomalyScore = anomalies.length > 0 
      ? anomalies.reduce((sum, anomaly) => sum + anomaly.score, 0) / anomalies.length
      : 0;
    
    return {
      hasAnomaly: anomalies.length > 0,
      anomalyScore,
      anomalies
    };
  }
}

// Export singleton instance
export const objectDetectionService = new ObjectDetectionService();
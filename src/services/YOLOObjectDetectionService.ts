// src/services/YOLOObjectDetectionService.ts
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

// Stanford Drone Dataset objects of interest
const STANFORD_DRONE_CLASSES = [
  'pedestrian', 
  'bicycle', 
  'car', 
  'skateboarder', 
  'cart', 
  'bus'
];

// COCO dataset classes that COCO-SSD is trained on
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

// Mapping from COCO classes to Stanford Drone Dataset classes
const CLASS_MAPPING: {[key: string]: string} = {
  'person': 'pedestrian',
  'bicycle': 'bicycle',
  'car': 'car',
  'motorcycle': 'bicycle', // Map motorcycles to bicycles
  'bus': 'bus',
  'truck': 'car',      // Map trucks to cars
  'skateboard': 'skateboarder'
};

class YOLOObjectDetectionService {
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
  
  // Direct reference to COCO-SSD model
  private cocoSsdModel: any = null;
  
  // Detection thresholds
  private scoreThreshold = 0.5;
  private iouThreshold = 0.5;
  private maxBoxes = 100;
  
  // Context-based anomaly detection
  private objectHistory: Array<{
    class: string;
    count: number;
    timestamp: number;
  }> = [];
  private historyWindow = 10000; // 10 seconds
  
  private anomalyRules: {[key: string]: (detection: Detection, frequency: number) => number} = {
    // Pedestrians are normal in low numbers, anomalous in large groups
    'pedestrian': (detection, frequency) => frequency > 5 ? 0.7 + Math.min(frequency / 20, 0.3) : 0,
    
    // Cars should not be in pedestrian areas (higher confidence = higher anomaly)
    'car': (detection, frequency) => detection.score > 0.8 ? 0.8 : 0.6,
    
    // Bikes at high speeds could be anomalies (simulated by detection box width)
    'bicycle': (detection, frequency) => {
      const [_, __, width, ___] = detection.bbox;
      // Simulate speed by box width (smaller width might mean faster movement)
      return width < 50 ? 0.75 : 0;
    },
    
    // Skateboarders in certain areas
    'skateboarder': (detection, frequency) => 0.6,
    
    // Carts are less common
    'cart': (detection, frequency) => 0.5,
    
    // Buses in pedestrian areas are unusual
    'bus': (detection, frequency) => 0.9
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

  // Load the model
  public async loadModel(): Promise<void> {
    try {
      console.log('Loading object detection model...');
      
      // Import COCO-SSD dynamically
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      
      console.log('COCO-SSD module loaded, initializing model...');
      
      // Load the model using the module's load function
      this.cocoSsdModel = await cocoSsd.load({
        base: 'mobilenet_v2'  // Use MobileNet v2 for better performance
      });
      
      console.log('COCO-SSD model loaded successfully');
      this.isLoaded = true;
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error loading COCO-SSD model:', error);
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
          
          // Run detection on the current video frame
          const detections = await this.runYoloDetection(videoElement);
          
          // Check for anomalies
          const anomalyResult = this.detectAnomalies(detections);
          
          // Store results
          this.lastDetections = detections;
          this.lastAnomalyResult = anomalyResult;
          
          // Send results to callback
          callback(detections, anomalyResult);
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
  
  // Run object detection on a video frame using COCO-SSD
  private async runYoloDetection(videoElement: HTMLVideoElement): Promise<Detection[]> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.cocoSsdModel) {
          return reject(new Error('Model not loaded'));
        }
        
        if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
          return resolve([]);
        }
        
        console.log('Running detection on video frame...');
        
        // Use a much lower score threshold to detect more objects
        const lowerScoreThreshold = 0.05;
        
        // Increase max boxes to detect more objects
        const maxBoxes = 100;
        
        // Run COCO-SSD detection
        const predictions = await this.cocoSsdModel.detect(videoElement, maxBoxes);
        
        console.log('Raw detection results:', predictions);
        
        // Convert COCO-SSD predictions to our Detection format
        const detections: Detection[] = predictions.map((prediction: any) => {
          const [x, y, width, height] = prediction.bbox;
          
          // Map COCO class to Stanford Drone Dataset class if possible
          let className = prediction.class;
          
          // Enhanced class mapping for aerial footage
          if (className === 'person') className = 'pedestrian';
          else if (className === 'truck' || className === 'car') className = 'car';
          else if (className === 'motorcycle' || className === 'bicycle') className = 'bicycle';
          
          return {
            bbox: [x, y, width, height],
            class: className,
            score: prediction.score
          };
        });
        
        // Filter with the lower threshold
        const filteredDetections = detections.filter(d => d.score >= lowerScoreThreshold);
        
        // Log detection counts both before and after filtering
        console.log(`Raw detections: ${detections.length}, After filtering: ${filteredDetections.length}`);
        
        resolve(filteredDetections);
      } catch (error) {
        console.error('Error in object detection:', error);
        reject(error);
      }
    });
  }

  // Context-based anomaly detection with custom rules
  private detectAnomalies(detections: Detection[]): AnomalyResult {
    const anomalies: Anomaly[] = [];
    const now = Date.now();
    
    // Update object history with current detections
    const classCounts: {[key: string]: number} = {};
    
    // Count objects by class
    detections.forEach(detection => {
      const className = detection.class;
      classCounts[className] = (classCounts[className] || 0) + 1;
    });
    
    // Add counts to history
    Object.keys(classCounts).forEach(className => {
      this.objectHistory.push({
        class: className,
        count: classCounts[className],
        timestamp: now
      });
    });
    
    // Remove old history entries
    this.objectHistory = this.objectHistory.filter(h => 
      now - h.timestamp < this.historyWindow
    );
    
    // Get object frequencies
    const objectFrequencies: {[key: string]: number} = {};
    this.objectHistory.forEach(h => {
      objectFrequencies[h.class] = (objectFrequencies[h.class] || 0) + h.count;
    });
    
    // Custom rules for anomaly detection
    const anomalyRules: {[key: string]: (detection: Detection, frequency: number) => number} = {
      // Pedestrians are normal in low numbers, anomalous in large groups
      'pedestrian': (detection, frequency) => frequency > 3 ? 0.7 + Math.min(frequency / 10, 0.3) : 0,
      
      // Any vehicles in pedestrian areas
      'car': (detection, frequency) => 0.6,
      
      // Any bicycles are potentially interesting
      'bicycle': (detection, frequency) => 0.6,
      
      // Traffic lights
      'traffic light': (detection, frequency) => 0.5,
      
      // Any of these are automatically anomalies
      'motorcycle': (detection, frequency) => 0.7,
      'truck': (detection, frequency) => 0.7,
      'bus': (detection, frequency) => 0.8
    };
    
    // Check each detection for anomalies based on rules
    detections.forEach(detection => {
      const className = detection.class;
      const frequency = objectFrequencies[className] || 0;
      
      // Apply anomaly rules
      if (anomalyRules[className]) {
        const anomalyScore = anomalyRules[className](detection, frequency);
        
        if (anomalyScore > 0) {
          anomalies.push({
            object: className,
            bbox: detection.bbox,
            score: anomalyScore
          });
        }
      } 
      // Default rule: If it's a rare object, mark as anomaly
      else if (frequency < 2) {
        anomalies.push({
          object: className,
          bbox: detection.bbox,
          score: 0.7
        });
      }
    });
    
    // Check for interactions between objects
    for (let i = 0; i < detections.length; i++) {
      for (let j = i + 1; j < detections.length; j++) {
        if (this.areBoxesClose(detections[i].bbox, detections[j].bbox)) {
          // If different types of objects are interacting, that's interesting
          if (detections[i].class !== detections[j].class) {
            anomalies.push({
              object: `interaction:${detections[i].class}_${detections[j].class}`,
              bbox: detections[i].bbox,
              score: 0.7
            });
          }
        }
      }
    }
    
    // Calculate overall anomaly score
    const anomalyScore = anomalies.length > 0 
      ? anomalies.reduce((sum, anomaly) => sum + anomaly.score, 0) / anomalies.length
      : 0;
    
    // An anomaly is present if there are any anomalies detected
    const hasAnomaly = anomalies.length > 0;
    
    return {
      hasAnomaly,
      anomalyScore,
      anomalies
    };
  }
  
  // Simple cluster detection using bounding box proximity
  private findClusters(detections: Detection[]): Detection[][] {
    const clusters: Detection[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < detections.length; i++) {
      if (processed.has(i)) continue;
      
      const cluster: Detection[] = [detections[i]];
      processed.add(i);
      
      for (let j = 0; j < detections.length; j++) {
        if (i === j || processed.has(j)) continue;
        
        // Check if detection j is close to any detection in the current cluster
        if (cluster.some(c => this.areBoxesClose(c.bbox, detections[j].bbox))) {
          cluster.push(detections[j]);
          processed.add(j);
        }
      }
      
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }
  
  // Check if two bounding boxes are close to each other
  private areBoxesClose(bbox1: [number, number, number, number], bbox2: [number, number, number, number]): boolean {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;
    
    // Calculate centers
    const cx1 = x1 + w1/2;
    const cy1 = y1 + h1/2;
    const cx2 = x2 + w2/2;
    const cy2 = y2 + h2/2;
    
    // Calculate distance
    const distance = Math.sqrt(Math.pow(cx2 - cx1, 2) + Math.pow(cy2 - cy1, 2));
    
    // Consider boxes close if centers are within average box size
    const avgSize = (w1 + h1 + w2 + h2) / 4;
    return distance < avgSize * 2;
  }
}

// Export singleton instance
export const yoloObjectDetectionService = new YOLOObjectDetectionService();
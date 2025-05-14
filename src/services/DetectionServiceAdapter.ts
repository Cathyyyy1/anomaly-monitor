// src/services/DetectionServiceAdapter.ts
// This adapter provides a clean interface to use the YOLO detection service with the existing components

import {
    yoloObjectDetectionService,
    Detection,
    AnomalyResult
  } from './YOLOObjectDetectionService';
  
  // Re-export types
  export type { Detection, AnomalyResult };
  
  // Simple adapter class - just forwards to YOLOObjectDetectionService
  class DetectionServiceAdapter {
    public setFrameSkip(skip: number): void {
      yoloObjectDetectionService.setFrameSkip(skip);
    }
    
    public async loadModel(): Promise<void> {
      return yoloObjectDetectionService.loadModel();
    }
    
    public isModelLoaded(): boolean {
      return yoloObjectDetectionService.isModelLoaded();
    }
    
    public detectObjectsOnVideo(
      videoElement: HTMLVideoElement,
      callback: (detections: Detection[], anomalyResult: AnomalyResult) => void,
      errorCallback?: (error: Error) => void
    ): void {
      yoloObjectDetectionService.detectObjectsOnVideo(
        videoElement,
        callback,
        errorCallback
      );
    }
  }
  
  // Export singleton instance
  export const detectionService = new DetectionServiceAdapter();
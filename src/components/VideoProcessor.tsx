import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, Paper, Chip, Stack, Button, Alert, Slider } from '@mui/material';
import { objectDetectionService, Detection, AnomalyResult } from '../services/ObjectDetectionService';

interface VideoProcessorProps {
    videoSrc: string;
    onDetection: (detections: Detection[], anomalyResult: AnomalyResult) => void;
    onVideoTimeUpdate?: (event: React.SyntheticEvent<HTMLVideoElement>) => void; // New prop for time updates
  }

const VideoProcessor: React.FC<VideoProcessorProps> = ({ 
  videoSrc, 
  onDetection,
  onVideoTimeUpdate 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(null);
  const [videoPlaybackStarted, setVideoPlaybackStarted] = useState<boolean>(false);
  const [videoLoadAttempts, setVideoLoadAttempts] = useState<number>(0);
  const [frameSkip, setFrameSkip] = useState<number>(2); // Skip every 2 frames
  const [frameCount, setFrameCount] = useState<number>(0);
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.8); // Higher threshold to reduce false positives

  // Memoize detection results handler with frame skipping and smoothing
  const handleDetectionResults = useCallback((
    newDetections: Detection[], 
    newAnomalyResult: AnomalyResult
  ) => {
    console.log('Got detection results:', newDetections.length, 'detections');
    
    // Update with new detections and smooth anomaly result
    setDetections(newDetections);
    
    // Apply anomaly threshold adjustment
    const adjustedAnomalyResult = {
      ...newAnomalyResult,
      hasAnomaly: newAnomalyResult.anomalyScore > anomalyThreshold,
      // Filter anomalies by threshold
      anomalies: newAnomalyResult.anomalies.filter(
        anomaly => anomaly.score > anomalyThreshold
      )
    };
    
    setAnomalyResult(adjustedAnomalyResult);
    
    // Call onDetection callback if provided, with adjusted result
    if (onDetection) {
      onDetection(newDetections, adjustedAnomalyResult);
    }
  }, [onDetection, anomalyThreshold]);

  // Start processing with frame skipping
  const startProcessing = useCallback(() => {
    const video = videoRef.current;
    if (!video || processing || modelLoading) {
      console.log('Cannot start processing:', 
                 !video ? 'Video ref is null' : 
                 processing ? 'Already processing' : 
                 'Model still loading');
      return;
    }
    
    // Make sure video is actually playing
    if (video.paused) {
      console.log("Video is paused, trying to play first");
      video.play()
        .then(() => {
          setProcessing(true);
          setVideoPlaybackStarted(true);
          
          // Proceed with ML processing with frame skip
          try {
            // Configure frame skip
            if (objectDetectionService.setFrameSkip) {
              objectDetectionService.setFrameSkip(frameSkip);
            }
            
            objectDetectionService.detectObjectsOnVideo(
              video, 
              handleDetectionResults
            );
          } catch (err) {
            console.error("Error in detectObjectsOnVideo:", err);
            setError(`Error starting detection: ${err}`);
            setProcessing(false);
          }
        })
        .catch(err => {
          console.error("Error playing video in startProcessing:", err);
          setError("Please click the video to start playback");
        });
      return;
    }

    setProcessing(true);
    console.log("Starting ML processing...");
    
    // Configure frame skip
    if (objectDetectionService.setFrameSkip) {
      objectDetectionService.setFrameSkip(frameSkip);
    }
    
    // Proceed with ML processing
    try {
      objectDetectionService.detectObjectsOnVideo(
        video, 
        handleDetectionResults
      );
    } catch (err: any) {
      console.error("Error in detectObjectsOnVideo:", err);
      setError(`Error starting detection: ${err.message || err}`);
      setProcessing(false);
    }
  }, [handleDetectionResults, modelLoading, processing, frameSkip]);

  // Smoother drawing function with double buffering
  const drawDetectionsSmooth = useCallback((
    ctx: CanvasRenderingContext2D,
    detections: Detection[],
    anomalyResult: AnomalyResult | null
  ) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !ctx) return;
    
    // Update frame counter for frame skipping
    const currentFrameCount = frameCount + 1;
    setFrameCount(currentFrameCount);
    
    // Only process every N frames to reduce flashing
    if (currentFrameCount % (frameSkip + 1) !== 0) {
      // Just redraw the previous frame if we're skipping
      if (previousFrameRef.current) {
        ctx.putImageData(previousFrameRef.current, 0, 0);
      } else {
        // Draw video frame only if we don't have a previous frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      return;
    }
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Save current frame for reuse
    try {
      previousFrameRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.warn('Unable to save frame data', e);
    }
    
    // Draw detection boxes if we have them
    if (detections && detections.length > 0) {
      detections.forEach(detection => {
        const [x, y, width, height] = detection.bbox;
        const isAnomaly = anomalyResult?.anomalies.some(
          a => a.object === detection.class && 
          a.bbox[0] === detection.bbox[0] && 
          a.bbox[1] === detection.bbox[1]
        );
        
        // Draw box
        ctx.strokeStyle = isAnomaly ? '#FF0000' : '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw label background
        const label = `${detection.class} ${Math.round(detection.score * 100)}%`;
        const textMetrics = ctx.measureText(label);
        const textHeight = 16; // Approximate height for 16px font
        
        ctx.fillStyle = isAnomaly ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(
          x, 
          y > textHeight ? y - textHeight : y,
          textMetrics.width + 6,
          textHeight
        );
        
        // Draw label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.fillText(
          label,
          x + 3,
          y > textHeight ? y - 3 : y + textHeight - 3
        );
      });
    }
    
    // Draw anomaly indicator if anomalies detected (less obtrusive)
    if (anomalyResult?.hasAnomaly) {
      // Draw a small indicator instead of full overlay
      const indicatorSize = 20;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(canvas.width - 30, 30, indicatorSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw score as text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${Math.round(anomalyResult.anomalyScore * 100)}%`,
        canvas.width - 30,
        30
      );
      ctx.textAlign = 'start'; // Reset text alignment
      ctx.textBaseline = 'alphabetic'; // Reset text baseline
    }
  }, [frameCount, frameSkip]);

  // Animation loop with frame skipping
  useEffect(() => {
    // Only run animation if processing and we have a video and canvas
    if (!processing || !videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Animation function
    const animate = () => {
      // Draw current frame with detections
      drawDetectionsSmooth(ctx, detections, anomalyResult);
      
      // Request next frame
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [processing, detections, anomalyResult, drawDetectionsSmooth]);

  // Load the model when component mounts
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelLoading(true);
        console.log('Loading object detection model...');
        await objectDetectionService.loadModel();
        console.log('Model loaded successfully');
        setModelLoading(false);
      } catch (err) {
        console.error('Failed to load object detection model:', err);
        setError('Failed to load object detection model. Try refreshing the page.');
        setModelLoading(false);
      }
    };

    loadModel();
    
    // Clean up animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, []);

  // Set up video when source changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.error('Video ref is null');
      return;
    }
  
    // Reset states
    setLoading(true);
    setDetections([]);
    setAnomalyResult(null);
    setError(null);
    setVideoPlaybackStarted(false);
    setFrameCount(0);
    previousFrameRef.current = null;
    
    console.log('Setting video source to:', videoSrc);
    
    // Cancel existing animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  
    const handleVideoLoaded = () => {
      console.log('Video loaded event fired!', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        duration: video.duration,
        readyState: video.readyState
      });
      
      setLoading(false);
      
      if (canvasRef.current) {
        console.log('Setting canvas dimensions to match video');
        // Explicitly set canvas dimensions to match video
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        // Important: For some browsers, we need to draw the first frame
        // to initialize the canvas correctly
        const ctx = canvas.getContext('2d');
        if (ctx && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Store initial frame
          try {
            previousFrameRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
          } catch (e) {
            console.warn('Unable to save initial frame data', e);
          }
        }
      }
      
      if (!modelLoading) {
        console.log('Model loaded, can start processing');
        // In this version, we won't auto-start processing
        // Instead, we'll require a user interaction
      }
    };
  
    const handleVideoError = (e: any) => {
      console.error('Video error event:', e);
      console.error('Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState
      });
      
      // Try with a different approach or retry
      const attempts = videoLoadAttempts + 1;
      setVideoLoadAttempts(attempts);
      
      if (attempts < 3) {
        console.log(`Retry attempt ${attempts} for video loading`);
        
        // Small delay before retry
        setTimeout(() => {
          // Try with different video attributes
          video.crossOrigin = "anonymous"; // Try with CORS
          video.load();
        }, 1000);
      } else {
        setError(`Video failed to load after ${attempts} attempts: ${video.error?.message || 'Unknown error'}`);
        setLoading(false);
      }
    };
  
    video.onloadeddata = handleVideoLoaded;
    video.onerror = handleVideoError;
    
    // Apply video attributes that might help with playback
    video.crossOrigin = "anonymous"; // Try with CORS
    video.playsInline = true;
    video.muted = true; // Start muted to help with autoplay
    video.controls = true; // Show controls for debugging
    
    console.log('Setting video src to:', videoSrc);
    video.src = videoSrc;
    video.load();
    
    return () => {
      console.log('Cleanup: removing video event listeners');
      video.onloadeddata = null;
      video.onerror = null;
      video.pause();
      setProcessing(false);
      setVideoPlaybackStarted(false);
      previousFrameRef.current = null;
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [videoSrc, modelLoading, videoLoadAttempts]);

  // Start processing when user clicks the button
  const handleStartProcessing = () => {
    if (!videoPlaybackStarted) {
      const video = videoRef.current;
      if (!video) return;
      
      video.play()
        .then(() => {
          console.log('Video playback started via click');
          setVideoPlaybackStarted(true);
          startProcessing();
        })
        .catch(err => {
          console.error('Error starting video playback via click:', err);
          setError(`Failed to play video: ${err.message || 'Unknown error'}`);
        });
    } else {
      startProcessing();
    }
  };
  
  // Manual retry functionality
  const handleRetry = () => {
    const video = videoRef.current;
    if (!video) return;
    
    setError(null);
    setLoading(true);
    setVideoPlaybackStarted(false);
    setFrameCount(0);
    previousFrameRef.current = null;
    
    // Completely reset the video element
    video.pause();
    video.currentTime = 0;
    video.muted = true;
    video.load();
  };

  // Handle frame skip slider
  const handleFrameSkipChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setFrameSkip(value);
    // Update in the service if it's running
    if (processing && objectDetectionService.setFrameSkip) {
      objectDetectionService.setFrameSkip(value);
    }
  };

  // Handle anomaly threshold slider
  const handleThresholdChange = (event: Event, newValue: number | number[]) => {
    setAnomalyThreshold(newValue as number);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
      {(loading || modelLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>
            {modelLoading ? 'Loading ML model...' : 'Loading video...'}
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ my: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleRetry}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Box>
      )}
      
      <Box sx={{ position: 'relative', border: '2px dashed #ccc', padding: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Debug Info - Video Source URL: {videoSrc || 'None'}
        </Typography>
        
        {/* Video element - visible for debugging */}
        <video 
          ref={videoRef} 
          playsInline
          autoPlay
          muted
          loop
          controls
          crossOrigin="anonymous"
          width="100%"
          onTimeUpdate={onVideoTimeUpdate}
          style={{ 
            border: '1px solid blue',
            marginBottom: '10px',
            display: 'block'  // Make it visible
          }}
        />
        
        {!videoPlaybackStarted && !loading && !modelLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartProcessing}
            >
              Start Video Analysis
            </Button>
          </Box>
        )}
        
        <canvas
          ref={canvasRef}
          style={{ 
            width: '100%', 
            maxHeight: '500px',
            objectFit: 'contain',
            border: '1px solid #ccc'
          }}
        />
        
        {!processing && !loading && !modelLoading && videoPlaybackStarted && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={startProcessing}
            >
              Start Detection
            </Button>
          </Box>
        )}
        
        {/* Detection settings */}
        {processing && (
          <Paper sx={{ mt: 2, p: 2 }}>
            <Typography variant="h6" gutterBottom>Detection Settings</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Frame Skip: {frameSkip} (higher = less flashing, lower performance impact)
              </Typography>
              <Slider
                value={frameSkip}
                onChange={handleFrameSkipChange}
                step={1}
                marks
                min={0}
                max={5}
                valueLabelDisplay="auto"
                disabled={!processing}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Anomaly Threshold: {anomalyThreshold.toFixed(2)} (higher = fewer alerts)
              </Typography>
              <Slider
                value={anomalyThreshold}
                onChange={handleThresholdChange}
                step={0.05}
                marks
                min={0.5}
                max={0.95}
                valueLabelDisplay="auto"
              />
            </Box>
          </Paper>
        )}
        
        {processing && anomalyResult && (
          <Paper sx={{ mt: 2, p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">Detection Results</Typography>
                {detections.length === 0 ? (
                  <Typography variant="body2">No objects detected</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {Array.from(new Set(detections.map((d: Detection) => d.class))).map((className: string) => {
                      const count = detections.filter((d: Detection) => d.class === className).length;
                      const isAnomaly = anomalyResult?.anomalies.some((a: any) => a.object === className);
                      
                      return (
                        <Chip 
                          key={`class-${className}`}
                          label={`${className} (${count})`}
                          color={isAnomaly ? 'error' : 'default'}
                          variant={isAnomaly ? 'filled' : 'outlined'}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
              
              <Box>
                <Typography variant="h6">
                  Anomaly Analysis
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1">
                    Status: {anomalyResult.hasAnomaly ? (
                      <Chip 
                        label="Anomaly Detected" 
                        color="error" 
                        variant="filled"
                      />
                    ) : (
                      <Chip 
                        label="Normal" 
                        color="success" 
                        variant="filled"
                      />
                    )}
                  </Typography>
                  <Typography variant="body1">
                    Anomaly Score: {(anomalyResult.anomalyScore * 100).toFixed(1)}%
                  </Typography>
                  {anomalyResult.anomalies.length > 0 && (
                    <>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        Detected Anomalies:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                        {anomalyResult.anomalies.map((anomaly: any, index: number) => (
                          <Chip
                            key={`anomaly-${index}`}
                            label={`${anomaly.object} (${(anomaly.score * 100).toFixed(1)}%)`}
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            </Stack>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default VideoProcessor;
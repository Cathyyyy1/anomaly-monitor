import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Chip, Stack, Divider, Alert, LinearProgress } from '@mui/material';

interface VideoDebugHelperProps {
  videoUrl: string;
}

const VideoDebugHelper: React.FC<VideoDebugHelperProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoInfo, setVideoInfo] = useState<{
    width: number;
    height: number;
    duration: number;
    readyState: number;
    videoUrl: string;
    fps: number;
  }>({
    width: 0,
    height: 0,
    duration: 0,
    readyState: 0,
    videoUrl: '',
    fps: 0
  });
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [frameCaptured, setFrameCaptured] = useState<boolean>(false);
  
  // Number of frames processed
  const [frameCount, setFrameCount] = useState<number>(0);
  
  // Calculate the frame rate every second
  useEffect(() => {
    let prevFrameCount = frameCount;
    let prevTime = Date.now();
    
    const fpsInterval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - prevTime;
      const newCount = frameCount;
      const framesDelta = newCount - prevFrameCount;
      
      if (elapsedMs > 0) {
        const fps = Math.round((framesDelta * 1000) / elapsedMs);
        
        setVideoInfo(prev => ({
          ...prev,
          fps
        }));
        
        prevFrameCount = newCount;
        prevTime = now;
      }
    }, 1000);
    
    return () => clearInterval(fpsInterval);
  }, [frameCount]);
  
  // Video animation frame handler - for tracking stats
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    let animationFrameId: number | null = null;
    
    // Function to update stats during playback
    const updateStats = () => {
      setCurrentTime(video.currentTime);
      setFrameCount(prev => prev + 1);
      
      animationFrameId = requestAnimationFrame(updateStats);
    };
    
    // Start tracking when playing
    const handlePlay = () => {
      setIsPlaying(true);
      updateStats();
    };
    
    // Stop tracking when paused
    const handlePause = () => {
      setIsPlaying(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };
    
    // Track time updates
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };
    
    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Clean up
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);
  
  // Set up video when source changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Reset states
    setError(null);
    setFrameCaptured(false);
    
    const handleVideoLoaded = () => {
      console.log('Debug Helper: Video loaded!', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        duration: video.duration,
        readyState: video.readyState
      });
      
      setVideoInfo({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        readyState: video.readyState,
        videoUrl,
        fps: 0
      });
    };
    
    const handleVideoError = (e: any) => {
      console.error('Debug Helper: Video error:', e);
      setError(`Video loading error: ${video.error?.message || 'Unknown error'}`);
    };
    
    video.onloadeddata = handleVideoLoaded;
    video.onerror = handleVideoError;
    
    video.src = videoUrl;
    video.load();
    
    return () => {
      video.onloadeddata = null;
      video.onerror = null;
      video.pause();
    };
  }, [videoUrl]);
  
  // Capture a still frame from the video
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    setFrameCaptured(true);
  };
  
  // Play the video from the start
  const playFromStart = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = 0;
    video.play().catch(err => {
      console.error('Debug Helper: Error playing video:', err);
      setError(`Error starting playback: ${err.message}`);
    });
  };
  
  // Get a formatted time string
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Get a description of readyState
  const getReadyStateDescription = (state: number): string => {
    switch (state) {
      case 0: return 'HAVE_NOTHING';
      case 1: return 'HAVE_METADATA';
      case 2: return 'HAVE_CURRENT_DATA';
      case 3: return 'HAVE_FUTURE_DATA';
      case 4: return 'HAVE_ENOUGH_DATA';
      default: return 'Unknown';
    }
  };
  
  // Calculate video load percentage
  const getLoadPercentage = (): number => {
    const video = videoRef.current;
    if (!video) return 0;
    
    // Use readyState as a simple indicator
    return (video.readyState / 4) * 100;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Video Debug Information
        </Typography>
        
        <Stack spacing={1}>
          <Typography variant="body2">
            <strong>Status:</strong> {isPlaying ? 'Playing' : 'Paused'}
          </Typography>
          <Typography variant="body2">
            <strong>Source:</strong> {videoInfo.videoUrl}
          </Typography>
          <Typography variant="body2">
            <strong>Dimensions:</strong> {videoInfo.width} × {videoInfo.height}
          </Typography>
          <Typography variant="body2">
            <strong>Duration:</strong> {formatTime(videoInfo.duration)}
          </Typography>
          <Typography variant="body2">
            <strong>Current Time:</strong> {formatTime(currentTime)} / {formatTime(videoInfo.duration)}
          </Typography>
          <Typography variant="body2">
            <strong>Ready State:</strong> {videoInfo.readyState} ({getReadyStateDescription(videoInfo.readyState)})
          </Typography>
          <Typography variant="body2">
            <strong>Frame Rate:</strong> {videoInfo.fps} FPS
          </Typography>
          <Typography variant="body2">
            <strong>Frame Counter:</strong> {frameCount} frames processed
          </Typography>
        </Stack>
        
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={getLoadPercentage()} sx={{ mb: 1 }} />
          <Typography variant="caption">
            Video Load Progress: {Math.round(getLoadPercentage())}%
          </Typography>
        </Box>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={playFromStart}
            disabled={!videoInfo.width || !videoInfo.height}
          >
            Play From Start
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={captureFrame}
            disabled={!videoInfo.width || !videoInfo.height}
          >
            Capture Frame
          </Button>
        </Box>
      </Paper>
      
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Video Element Test
      </Typography>
      
      <Box sx={{ border: '1px solid #ddd', mb: 2 }}>
        <video
          ref={videoRef}
          controls
          muted
          playsInline
          crossOrigin="anonymous"
          style={{ width: '100%', maxHeight: '500px' }}
        />
      </Box>
      
      {frameCaptured && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Captured Frame
          </Typography>
          <Box sx={{ border: '1px solid #ddd', mb: 2 }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }}
            />
          </Box>
        </>
      )}
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.8rem' }}>
        Note: If the video plays here but fails in the Video Analysis section, the issue is likely 
        with the ML processing component, not the video loading itself.
      </Typography>
    </Box>
  );
};

export default VideoDebugHelper;
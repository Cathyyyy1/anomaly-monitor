// src/components/VideoDebugHelper.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, Paper, Divider, Button, Alert } from '@mui/material';

interface VideoDebugHelperProps {
  videoUrl: string;
}

const VideoDebugHelper: React.FC<VideoDebugHelperProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>('Initializing');
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{
    width: number;
    height: number;
    duration: number;
    readyState: number;
  } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setStatus('Video loaded successfully');
      setVideoInfo({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        readyState: video.readyState
      });
    };

    const handleCanPlay = () => {
      setStatus('Video can play');
    };

    const handleError = () => {
      setStatus('Error loading video');
      setError(`Error: ${video.error?.message || 'Unknown error'}`);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Set source and try to load
    setStatus('Loading video...');
    video.src = videoUrl;
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  const handlePlayVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.play()
      .then(() => {
        setStatus('Video playing');
      })
      .catch(err => {
        setStatus('Error playing video');
        setError(`Play error: ${err.message}`);
      });
  };

  const handleReloadVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    setStatus('Reloading video...');
    setError(null);
    video.load();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Video Debug Helper
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Video Source:</Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          {videoUrl}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Status: {status}</Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </Box>

      {videoInfo && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Video Information:</Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2">Width: {videoInfo.width}px</Typography>
            <Typography variant="body2">Height: {videoInfo.height}px</Typography>
            <Typography variant="body2">
              Duration: {videoInfo.duration.toFixed(2)} seconds
            </Typography>
            <Typography variant="body2">
              Ready State: {videoInfo.readyState} ({
                videoInfo.readyState === 0 ? 'HAVE_NOTHING' :
                videoInfo.readyState === 1 ? 'HAVE_METADATA' :
                videoInfo.readyState === 2 ? 'HAVE_CURRENT_DATA' :
                videoInfo.readyState === 3 ? 'HAVE_FUTURE_DATA' :
                videoInfo.readyState === 4 ? 'HAVE_ENOUGH_DATA' : 'Unknown'
              })
            </Typography>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" onClick={handlePlayVideo}>
          Play Video
        </Button>
        <Button variant="outlined" onClick={handleReloadVideo}>
          Reload Video
        </Button>
      </Box>

      <Box>
        <video
          ref={videoRef}
          controls
          width="100%"
          style={{ border: '1px solid #ccc' }}
          muted
          playsInline
          crossOrigin="anonymous"
        />
      </Box>
    </Paper>
  );
};

export default VideoDebugHelper;
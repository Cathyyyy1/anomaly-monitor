// src/components/VideoTest.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Button, Stack, Divider } from '@mui/material';

const VideoTest: React.FC = () => {
  const externalVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [externalVideoStatus, setExternalVideoStatus] = useState<string>('Not loaded');
  const [localVideoStatus, setLocalVideoStatus] = useState<string>('Not loaded');
  
  // URLs to test
  const externalUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const localUrl = '/samples/stanford-drone/bookstore_video0.mp4'; // Adjust this path if needed
  
  useEffect(() => {
    // Set up event listeners for external video
    const externalVideo = externalVideoRef.current;
    if (externalVideo) {
      externalVideo.onloadeddata = () => {
        setExternalVideoStatus('Loaded successfully');
        console.log('External video loaded:', {
          width: externalVideo.videoWidth,
          height: externalVideo.videoHeight,
          duration: externalVideo.duration,
        });
      };
      
      externalVideo.onerror = (e) => {
        setExternalVideoStatus(`Error: ${externalVideo.error?.message || 'Unknown error'}`);
        console.error('External video error:', externalVideo.error);
      };
    }
    
    // Set up event listeners for local video
    const localVideo = localVideoRef.current;
    if (localVideo) {
      localVideo.onloadeddata = () => {
        setLocalVideoStatus('Loaded successfully');
        console.log('Local video loaded:', {
          width: localVideo.videoWidth,
          height: localVideo.videoHeight,
          duration: localVideo.duration,
        });
      };
      
      localVideo.onerror = (e) => {
        setLocalVideoStatus(`Error: ${localVideo.error?.message || 'Unknown error'}`);
        console.error('Local video error:', localVideo.error);
      };
    }
  }, []);
  
  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Video Test Page</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This page tests direct video loading without any processing or canvas operations.
      </Typography>
      
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h5" gutterBottom>Test 1: External Video</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          URL: {externalUrl}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Status: <strong>{externalVideoStatus}</strong>
        </Typography>
        
        <video
          ref={externalVideoRef}
          src={externalUrl}
          controls
          width="100%"
          height="auto"
          style={{ border: '1px solid #ccc', borderRadius: '4px' }}
          muted
          playsInline
        />
      </Paper>
      
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h5" gutterBottom>Test 2: Local Video</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          URL: {localUrl}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Status: <strong>{localVideoStatus}</strong>
        </Typography>
        
        <video
          ref={localVideoRef}
          src={localUrl}
          controls
          width="100%"
          height="auto"
          style={{ border: '1px solid #ccc', borderRadius: '4px' }}
          muted
          playsInline
        />
      </Paper>
      
      <Typography variant="h6">Troubleshooting Tips:</Typography>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="body2">1. Check browser console for errors</Typography>
        <Typography variant="body2">2. Verify the video file paths are correct</Typography>
        <Typography variant="body2">3. Make sure the video files are in the public folder</Typography>
        <Typography variant="body2">4. Check video format compatibility with your browser</Typography>
      </Stack>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          onClick={() => window.location.href = '/'}
        >
          Back to Main Page
        </Button>
      </Box>
    </Box>
  );
};

export default VideoTest;
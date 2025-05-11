// src/components/VideoUploader.tsx
import React, { useState, useRef } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';

interface VideoUploaderProps {
  onVideoSelect: (videoUrl: string) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onVideoSelect }) => {
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    
    if (!file) {
      return;
    }

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setError(null);

    try {
      // Create a local object URL for the video
      const videoUrl = URL.createObjectURL(selectedFile);
      console.log('Created video URL:', videoUrl);
      onVideoSelect(videoUrl);
    } catch (err) {
      console.error('Error creating object URL:', err);
      setError('Failed to process video file');
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        Upload Your Own Video
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          component="label"
        >
          Select Video
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={handleFileChange}
          />
        </Button>
        
        {selectedFile && (
          <>
            <Typography variant="body2" sx={{ ml: 1 }}>
              {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </Typography>
            
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={clearSelection}
            >
              Clear
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              sx={{ ml: 'auto' }}
            >
              Use This Video
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
};

export default VideoUploader;
// src/components/SampleSelector.tsx
import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, MenuItem, Button, Select, SelectChangeEvent, Alert } from '@mui/material';

// Stanford Drone Dataset sample videos
const samples = [
  // Fallback to a guaranteed working video
  { 
    id: 'test_video', 
    name: 'Test Video (Guaranteed)', 
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' 
  },
  // Local video with proper path (should start with /)
  { 
    id: 'bookstore_0', 
    name: 'Bookstore Video 0', 
    url: '/samples/stanford-drone/bookstore_optimized_video0.mp4' 
  },
  // Add additional sample with proper path
  { 
    id: 'bookstore_alt', 
    name: 'Bookstore Video (Alternative)', 
    url: '/samples/stanford-drone/bookstore_video0.mp4' 
  },
];

interface SampleSelectorProps {
  onSelectSample: (url: string) => void;
}

const SampleSelector: React.FC<SampleSelectorProps> = ({ onSelectSample }) => {
  const [selectedSample, setSelectedSample] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [testingVideo, setTestingVideo] = useState(false);

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedSample(event.target.value);
    setError(null);
  };

  const handleLoadTestVideo = () => {
    const testVideo = samples.find(s => s.id === 'test_video');
    if (testVideo) {
      console.log("Loading guaranteed test video directly");
      setError(null);
      onSelectSample(testVideo.url);
    }
  };

  const handleLoadSample = () => {
    const sample = samples.find(s => s.id === selectedSample);
    if (!sample) return;
    
    console.log("Loading sample video from URL:", sample.url);
    setTestingVideo(true);
    
    // Test if the video exists and can be loaded
    const videoTest = document.createElement('video');
    videoTest.style.display = 'none';
    // Add crossOrigin attribute to help with CORS issues
    videoTest.crossOrigin = "anonymous";
    document.body.appendChild(videoTest);
    
    // Set a timeout to handle cases where events might not fire
    const timeoutId = setTimeout(() => {
      console.warn("Video load timeout - proceeding anyway");
      document.body.removeChild(videoTest);
      setTestingVideo(false);
      setError(null);
      onSelectSample(sample.url);
    }, 5000); // 5-second timeout
    
    videoTest.onloadeddata = () => {
      console.log("Video loaded successfully:", sample.url);
      document.body.removeChild(videoTest);
      clearTimeout(timeoutId);
      setTestingVideo(false);
      setError(null);
      onSelectSample(sample.url);
    };
    
    videoTest.oncanplaythrough = () => {
      // Alternative event that sometimes fires when onloadeddata doesn't
      if (document.body.contains(videoTest)) {
        console.log("Video can play through:", sample.url);
        document.body.removeChild(videoTest);
        clearTimeout(timeoutId);
        setTestingVideo(false);
        setError(null);
        onSelectSample(sample.url);
      }
    };
    
    videoTest.onerror = () => {
      console.error("Error loading video from:", sample.url);
      console.error("Video error details:", videoTest.error);
      
      // Only remove if still in document
      if (document.body.contains(videoTest)) {
        document.body.removeChild(videoTest);
      }
      
      clearTimeout(timeoutId);
      setTestingVideo(false);
      
      // Special handling for local files
      if (sample.url.startsWith('/')) {
        setError(`Could not load local video. Verify the file exists at ${sample.url} in the public folder.`);
        
        // If local file fails, suggest using the sample video
        if (sample.id !== 'test_video') {
          console.log("Suggesting fallback to test video");
        }
      } else {
        setError(`Could not load video from ${sample.url}. Network error or invalid URL.`);
      }
    };
    
    // Set source and try to load the video
    try {
      videoTest.src = sample.url;
      videoTest.load();
    } catch (err) {
      console.error("Exception while setting video source:", err);
      if (document.body.contains(videoTest)) {
        document.body.removeChild(videoTest);
      }
      clearTimeout(timeoutId);
      setTestingVideo(false);
      setError(`Exception loading video: ${err}`);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1">Stanford Drone Dataset Samples</Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
          {error}
          {!selectedSample.includes('test_video') && (
            <Button 
              variant="text" 
              color="error" 
              onClick={handleLoadTestVideo}
              sx={{ ml: 1, mt: 1 }}
            >
              Try Fallback Video
            </Button>
          )}
        </Alert>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        <FormControl fullWidth sx={{ mr: 2 }}>
          <InputLabel id="sample-select-label">Select a sample</InputLabel>
          <Select
            labelId="sample-select-label"
            value={selectedSample}
            label="Select a sample"
            onChange={handleChange}
          >
            {samples.map(sample => (
              <MenuItem key={sample.id} value={sample.id}>{sample.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleLoadSample}
          disabled={!selectedSample || testingVideo}
        >
          {testingVideo ? "Testing..." : "Load Sample"}
        </Button>
      </Box>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Having trouble? Try these options:
        </Typography>
        <Box sx={{ display: 'flex', mt: 1, gap: 1 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={handleLoadTestVideo}
          >
            Load Guaranteed Working Video
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => window.location.href = '/video-test'}
          >
            Run Video Test
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SampleSelector;
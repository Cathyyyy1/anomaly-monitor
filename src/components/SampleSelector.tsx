import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  Link, 
  Paper 
} from '@mui/material';
// Import Collapse from @mui/material/Collapse directly to avoid transition group issues
import Collapse from '@mui/material/Collapse';

// Stanford Drone Dataset sample videos
const STANFORD_DRONE_SAMPLES = [
  {
    id: 'bookstore-0',
    name: 'Bookstore Scene 0',
    thumbnail: '/samples/stanford-drone/bookstore_0_reference.jpg',
    url: '/samples/stanford-drone/bookstore_video0.mp4'
  },
  {
    id: 'coupa-0',
    name: 'Coupa Cafe Scene 0',
    thumbnail: '/samples/stanford-drone/coupa_0_reference.jpg',
    url: '/samples/stanford-drone/coupa_0_video.mp4'
  },
  {
    id: 'deathCircle-0',
    name: 'Death Circle Scene 0',
    thumbnail: '/samples/stanford-drone/deathCircle_0_reference.jpg',
    url: '/samples/stanford-drone/deathCircle_0_video.mp4'
  },
  {
    id: 'gates-0',
    name: 'Gates Building Scene 0',
    thumbnail: '/samples/stanford-drone/gates_0_reference.jpg',
    url: '/samples/stanford-drone/gates_0_video.mp4'
  },
  {
    id: 'hyang-0',
    name: 'Huang Scene 0',
    thumbnail: 'https://stanford.edu/~alahi/StanfordDroneDataset/hyang/video0/reference.jpg',
    url: 'https://storage.googleapis.com/sdd-videos/hyang_video0.mp4'
  },
  {
    id: 'nexus-0',
    name: 'Nexus Scene 0',
    thumbnail: 'https://stanford.edu/~alahi/StanfordDroneDataset/nexus/video0/reference.jpg',
    url: 'https://storage.googleapis.com/sdd-videos/nexus_video0.mp4'
  },
  {
    id: 'quad-0',
    name: 'Quad Scene 0',
    thumbnail: 'https://stanford.edu/~alahi/StanfordDroneDataset/quad/video0/reference.jpg',
    url: 'https://storage.googleapis.com/sdd-videos/quad_video0.mp4'
  },
  {
    id: 'little-0',
    name: 'Little Scene 0',
    thumbnail: 'https://stanford.edu/~alahi/StanfordDroneDataset/little/video0/reference.jpg',
    url: 'https://storage.googleapis.com/sdd-videos/little_video0.mp4'
  }
];

// Fallback videos if Stanford Drone Dataset isn't available
const FALLBACK_VIDEOS = [
  {
    id: 'crossroad-1',
    name: 'Crossroad Traffic',
    thumbnail: '/api/placeholder/320/180',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  {
    id: 'pedestrians-1',
    name: 'Pedestrian Walkway',
    thumbnail: '/api/placeholder/320/180',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  },
  {
    id: 'street-1',
    name: 'Street Scene',
    thumbnail: '/api/placeholder/320/180',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  }
];

interface SampleSelectorProps {
  onSelectSample: (sampleUrl: string) => void;
}

const SampleSelector: React.FC<SampleSelectorProps> = ({ onSelectSample }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const handleSelectSample = (url: string) => {
    console.log(`Selected sample video: ${url}`);
    onSelectSample(url);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          Select a sample from the Stanford Drone Dataset
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Samples' : 'Show Samples'}
        </Button>
      </Box>
      
      <Collapse in={expanded}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            The Stanford Drone Dataset contains aerial videos captured by drones of various locations
            on the Stanford campus, featuring pedestrians, bicyclists, skateboarders, cars, buses, and carts.
          </Typography>
          <Link 
            href="https://cvgl.stanford.edu/projects/uav_data/" 
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 2, display: 'block' }}
          >
            Learn more about the Stanford Drone Dataset
          </Link>
        </Paper>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
          {STANFORD_DRONE_SAMPLES.map((sample) => (
            <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4', lg: 'span 3' } }} key={sample.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  transform: hoveredId === sample.id ? 'scale(1.03)' : 'scale(1)',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={() => handleSelectSample(sample.url)}
                onMouseEnter={() => setHoveredId(sample.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={sample.thumbnail}
                  alt={sample.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="body2" component="div">
                    {sample.name}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
        
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
          Fallback Videos (if Stanford Dataset unavailable)
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
          {FALLBACK_VIDEOS.map((video) => (
            <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }} key={video.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={() => handleSelectSample(video.url)}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={video.thumbnail}
                  alt={video.name}
                />
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="body2" component="div">
                    {video.name}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default SampleSelector;
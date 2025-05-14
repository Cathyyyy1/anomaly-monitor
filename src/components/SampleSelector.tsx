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
    thumbnail: '/samples/stanford-drone/hyang_0_reference.jpg',
    url: '/samples/stanford-drone/hyang_0_video.mp4'
  },
  {
    id: 'nexus-0',
    name: 'Nexus Scene 0',
    thumbnail: '/samples/stanford-drone/nexus_0_reference.jpg',
    url: '/samples/stanford-drone/nexus_0_video.mp4'
  },
  {
    id: 'quad-0',
    name: 'Quad Scene 0',
    thumbnail: '/samples/stanford-drone/quad_0_reference.jpg',
    url: '/samples/stanford-drone/quad_0_video.mp4'
  },
  {
    id: 'little-0',
    name: 'Little Scene 0',
    thumbnail: '/samples/stanford-drone/little_0_reference.jpg',
    url: '/samples/stanford-drone/little_0_video.mp4'
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
        
      </Collapse>
    </Box>
  );
};

export default SampleSelector;
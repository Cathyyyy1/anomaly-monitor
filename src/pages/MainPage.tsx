import React, { useEffect, useState, ChangeEvent } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import AlertDetailModal from '../components/AlertDetailModal';

interface Alert {
  id: number;
  timestamp: string;
  type: string;
  message: string;
}

const MainPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const API_URL = 'http://18.117.146.197:4000';

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`[${new Date().toISOString()}] Attempting to fetch alerts from ${API_URL}/alerts`);
      
      const response = await fetch(`${API_URL}/api/alerts`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
      });
      
      console.log(`[${new Date().toISOString()}] Response received:`, {
        status: response.status,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] Alerts data received:`, data);
      setAlerts(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${new Date().toISOString()}] Failed to fetch alerts:`, errorMessage);
      setError(`Failed to fetch alerts: ${errorMessage}`);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`[${new Date().toISOString()}] File selected:`, {
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`
      });
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.log(`[${new Date().toISOString()}] Upload attempted with no file selected`);
      return alert("Please select a video file first.");
    }

    console.log(`[${new Date().toISOString()}] Preparing to upload file:`, {
      name: selectedFile.name,
      type: selectedFile.type,
      size: `${Math.round(selectedFile.size / 1024)} KB`
    });

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      console.log(`[${new Date().toISOString()}] Sending upload request to ${API_URL}/upload`);
      
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      console.log(`[${new Date().toISOString()}] Upload response received:`, {
        status: response.status,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();
      console.log(`[${new Date().toISOString()}] Upload successful:`, result);
      alert("Upload successful!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${new Date().toISOString()}] Upload failed:`, errorMessage);
      alert(`Upload failed: ${errorMessage}`);
    }
  };

  const handleRowClick = (alert: Alert) => {
    console.log(`[${new Date().toISOString()}] Alert selected:`, alert);
    setSelectedAlert(alert);
  };

  const handleCloseModal = () => {
    console.log(`[${new Date().toISOString()}] Alert detail modal closed`);
    setSelectedAlert(null);
  };

  return (
    <>
      <Container sx={{ py: 4 }}>
        {/* Search Section */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6">Search Criteria</Typography>
          <TextField fullWidth label="Search" margin="normal" />
          <Button variant="contained">Search</Button>
        </Paper>

        {/* Alert Table */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6">Search Results</Typography>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {isLoading ? (
            <Typography>Loading alerts...</Typography>
          ) : alerts.length === 0 ? (
            <Typography>No alerts found</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(alert)}
                  >
                    <TableCell>{alert.id}</TableCell>
                    <TableCell>{alert.timestamp}</TableCell>
                    <TableCell>{alert.type}</TableCell>
                    <TableCell>{alert.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Button 
            variant="outlined" 
            onClick={fetchAlerts} 
            sx={{ mt: 2 }}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh Alerts'}
          </Button>
        </Paper>

        {/* File Upload Section */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6">Upload Video</Typography>
          <input type="file" accept="video/*" onChange={handleFileChange} />
          <Button
            variant="contained"
            onClick={handleUpload}
            sx={{ mt: 2 }}
            disabled={!selectedFile}
          >
            Upload
          </Button>
        </Paper>

        {/* Video Display */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Video</Typography>
          <video width="320" height="240" controls>
            <source src="movie.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </Paper>
      </Container>

      {/* Modal for Alert Details */}
      <AlertDetailModal
        open={!!selectedAlert}
        onClose={handleCloseModal}
        alert={selectedAlert}
      />
    </>
  );
};

export default MainPage;
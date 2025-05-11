import React, { useEffect, useState, ChangeEvent, useCallback, useRef } from 'react';
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
  TableBody,
  Box,
  Alert,
  IconButton,
  Chip,
  Collapse
} from '@mui/material';
import AlertDetailModal from '../components/AlertDetailModal';
import VideoProcessor from '../components/VideoProcessor';
import SampleSelector from '../components/SampleSelector';
import { Detection, AnomalyResult } from '../services/ObjectDetectionService';
import VideoDebugHelper from '../components/VideoDebugHelper';

// Enhanced Alert interface
interface AlertData {
  id: number;
  timestamp: string;
  type: string;
  message: string;
  severity?: string;
  status?: string;
  metadata?: {
    location?: string;
    detector?: string;
    detections?: any[];
    anomalies?: any[];
    [key: string]: any;
  };
  frames?: Frame[];
}

interface Frame {
  id: number;
  alertId: number;
  frameNumber: number;
  timestamp: string;
  s3Key: string;
  anomalyScore: number;
}

const MainPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [processingResults, setProcessingResults] = useState<{
    detections: Detection[];
    anomalyResult: AnomalyResult;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [lastVideoLoadTime, setLastVideoLoadTime] = useState<number>(0);
  const [currentFrameNumber, setCurrentFrameNumber] = useState<number>(0);

  const [frameTimestamps, setFrameTimestamps] = useState<number[]>([]);
  const [detectionCount, setDetectionCount] = useState<number>(0);

  const alertedFrameSet = useRef<Set<number>>(new Set());

  // For hidden search results
  const [showResults, setShowResults] = useState<boolean>(false);

  // For reduced alert generation
  const [alertCooldowns, setAlertCooldowns] = useState<{[key: string]: number}>({});
  const [globalCooldown, setGlobalCooldown] = useState<number>(0);
  const ALERT_COOLDOWN = 600000; // 2 minutes between alerts of the same type
  const GLOBAL_COOLDOWN = 120000; // 30 seconds between any alerts

  const API_URL = 'http://18.117.146.197:4000';

  // Fetch alerts on component mount
  useEffect(() => {
    fetchAlerts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`[${new Date().toISOString()}] Attempting to fetch alerts from ${API_URL}/api/alerts`);
      
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
      // Hide results after refresh
      setShowResults(false);
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
      setUploadError(null);
      
      // Create object URL for video preview
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      setVideoUrl(URL.createObjectURL(file));
      setLastVideoLoadTime(Date.now());
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

    // Reset any previous upload errors
    setUploadError(null);

    try {
      // Try the correct endpoint (without /api prefix)
      console.log(`[${new Date().toISOString()}] Sending upload request to ${API_URL}/upload`);
      
      const response = await fetch(`${API_URL}/upload`, {
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
      
      // Create a URL for the uploaded video
      if (result.file && result.file.path) {
        // If the server returns a path, use it
        setVideoUrl(`${API_URL}/${result.file.path}`);
        setLastVideoLoadTime(Date.now());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${new Date().toISOString()}] Upload failed:`, errorMessage);
      setUploadError(errorMessage);
      
      // Don't show an alert dialog as we'll display the error in the UI
      // We'll continue to use the local file for analysis
    }
  };

  const handleRowClick = async (alert: AlertData) => {
    console.log(`[${new Date().toISOString()}] Alert selected:`, alert);
    
    try {
      // Fetch detailed alert information including frames
      const response = await fetch(`${API_URL}/api/alerts/${alert.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const detailedAlert = await response.json();
      console.log(`[${new Date().toISOString()}] Detailed alert data:`, detailedAlert);
      setSelectedAlert(detailedAlert);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Failed to fetch alert details:`, err);
      // Fall back to basic alert info
      setSelectedAlert(alert);
    }
  };

  const handleCloseModal = () => {
    console.log(`[${new Date().toISOString()}] Alert detail modal closed`);
    setSelectedAlert(null);
  };

  // Handler for sample selection
  const handleSelectSample = (sampleUrl: string) => {
    console.log(`[${new Date().toISOString()}] Sample selected:`, sampleUrl);
    setVideoUrl(sampleUrl);
    setLastVideoLoadTime(Date.now());
  };

  // Handler for detection results with improved cooldowns and smarter alert creation
  const handleDetectionResults = (
    detections: Detection[],
    anomalyResult: AnomalyResult
  ) => {
    setProcessingResults({ detections, anomalyResult });
    setFrameTimestamps(prev => [...prev, Date.now()]);
  
    const now = Date.now();
  
    if (now - globalCooldown < GLOBAL_COOLDOWN) {
      console.log(`Skipping alert generation - in global cooldown`);
      return;
    }
  
    if (
      anomalyResult.hasAnomaly &&
      anomalyResult.anomalyScore > 0.7 &&
      anomalyResult.anomalies.length > 0
    ) {
      const anomalyTypes = Array.from(
        new Set(anomalyResult.anomalies.map(a => a.object))
      );
      const alertKey = anomalyTypes.sort().join(',');
      const lastAlertTime = alertCooldowns[alertKey] || 0;
  
      if (now - lastAlertTime > ALERT_COOLDOWN) {
        const video = document.querySelector('video');
  
        setDetectionCount(prev => {
          const newCount = prev + 1;
  
          const captureVideoFrame = () => {
            if (!video) return null;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.8);
          };
  
          const metadata = {
            detections: detections.map(d => ({
              class: d.class,
              score: d.score
            })),
            anomalies: anomalyResult.anomalies,
            anomalyScore: anomalyResult.anomalyScore,
            videoTime: video?.currentTime || 0,
            frameImage: captureVideoFrame(),
            detectionSequence: newCount
          };
          const alreadyAlerted = alerts.some(alert => {
            const seq = typeof alert.metadata === 'string'
              ? JSON.parse(alert.metadata).detectionSequence
              : alert.metadata?.detectionSequence;
            return seq === newCount;
          });
          
          if (alreadyAlerted) {
            console.log(`[${new Date().toISOString()}] Skipping duplicate for Frame #${newCount} — already exists in local state.`);
            return newCount; // Skip creating alert
          }
          
  
          if (alertedFrameSet.current.has(newCount)) {
            console.log(`[${new Date().toISOString()}] Frame #${newCount} already alerted — skipping.`);
            return newCount;
          }
          
          // ✅ Mark this frame as alerted
          alertedFrameSet.current.add(newCount);

          
          console.log("📦 Alert metadata being sent:", metadata);
          createAlertFromDetection(detections, anomalyResult, anomalyTypes, metadata);
          setAlertCooldowns(prev => ({ ...prev, [alertKey]: now }));
          setGlobalCooldown(now);
  
          return newCount;
        });
      }
    }
  };
  

  // Create an alert based on detection results with improved messaging
  const createAlertFromDetection = async (
    detections: Detection[],
    anomalyResult: AnomalyResult,
    anomalyTypes: string[] = [],
    metadata: any = {}
  ) => {
    try {
      const now = new Date();
      const timestampStr = now.toISOString();
  
      // Count instances of each anomaly type
      const anomalyCounts: { [key: string]: number } = {};
      if (anomalyTypes.length === 0) {
        anomalyTypes = Array.from(new Set(anomalyResult.anomalies.map(a => a.object)));
      }
      anomalyTypes.forEach(type => {
        anomalyCounts[type] = anomalyResult.anomalies.filter(a => a.object === type).length;
      });
  
      const message = anomalyTypes.map(type =>
        `${type} (${anomalyCounts[type]})`
      ).join(', ');
  
      let description = '';
      if (anomalyTypes.length > 1) {
        description = `Detected ${message}`;
      } else {
        const count = anomalyCounts[anomalyTypes[0]];
        description = `Detected ${count > 1 ? `${count} instances of` : ''} ${anomalyTypes[0]}`;
      }
  
      const existingAlertsRes = await fetch(`${API_URL}/api/alerts`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
  
      if (!existingAlertsRes.ok) {
        throw new Error('Failed to fetch existing alerts for deduplication');
      }
  
      const allAlerts = await existingAlertsRes.json();
  
      // ✅ New: prevent duplicates by frame number
      const frameNumber = metadata?.detectionSequence;
      const isDuplicateFrame = allAlerts.some((alert: AlertData) => {
        const seq = typeof alert.metadata === 'string'
          ? JSON.parse(alert.metadata).detectionSequence
          : alert.metadata?.detectionSequence;
        return seq === frameNumber;
      });
  
      if (isDuplicateFrame) {
        console.log(`[${new Date().toISOString()}] Skipping alert — Frame #${frameNumber} already has an alert.`);
        return;
      }
  
      // Optional: Still apply message+time deduplication
      const tenMinutesAgo = now.getTime() - 600000;
      const similarRecentAlerts = allAlerts.filter((alert: AlertData) => {
        const alertTime = new Date(alert.timestamp).getTime();
        if (alertTime < tenMinutesAgo) return false;
        return alert.message === description;
      });
  
      if (similarRecentAlerts.length > 0) {
        console.log(`[${new Date().toISOString()}] Skipping alert: "${description}" — already seen recently.`);
        return;
      }
  
      // ✅ Post the alert
      const response = await fetch(`${API_URL}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: timestampStr,
          type: 'ML Detection',
          message: description,
          severity: anomalyResult.anomalyScore > 0.85 ? 'critical' : 'high',
          status: 'new',
          metadata
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to create alert');
      }
  
      const data = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ Alert created:`, data);
      fetchAlerts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${new Date().toISOString()}] ❌ Alert creation failed:`, errorMessage);
    }
  };

  const deduplicateAlerts = async () => {
    if (!window.confirm("This will remove duplicate alerts in your history. Continue?")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Fetch all alerts
      const response = await fetch(`${API_URL}/api/alerts`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts for deduplication');
      }
      
      const allAlerts = await response.json();
      
      // Group alerts by message
      const alertsByMessage: {[key: string]: AlertData[]} = {};
      
      allAlerts.forEach((alert: AlertData) => {
        const message = alert.message;
        if (!alertsByMessage[message]) {
          alertsByMessage[message] = [];
        }
        alertsByMessage[message].push(alert);
      });
      
      // For each group, keep the most recent alert and delete the rest
      const deletePromises: Promise<any>[] = [];
      
      for (const message in alertsByMessage) {
        const alerts = alertsByMessage[message];
        if (alerts.length <= 1) continue; // Skip if only one alert
        
        // Sort by timestamp (newest first)
        alerts.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Keep the first (newest) alert, delete the rest
        for (let i = 1; i < alerts.length; i++) {
          deletePromises.push(
            fetch(`${API_URL}/api/alerts/${alerts[i].id}`, {
              method: 'DELETE',
            })
          );
        }
      }
      
      // Wait for all delete operations to complete
      await Promise.all(deletePromises);
      
      // Refresh the alerts list
      fetchAlerts();
      alert(`Deduplication complete. Removed ${deletePromises.length} duplicate alerts.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${new Date().toISOString()}] Failed to deduplicate alerts:`, errorMessage);
      alert(`Failed to deduplicate alerts: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
    console.log(`[${new Date().toISOString()}] Debug mode ${!debugMode ? 'enabled' : 'disabled'}`);
  };
  
  // Toggle showing results
  const toggleShowResults = () => {
    setShowResults(!showResults);
  };
  
  // Clear all alerts
  const handleClearAlerts = async () => {
    if (!window.confirm("Are you sure you want to clear all alerts? This cannot be undone.")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Option 1: If your backend has a "clear all" endpoint
      // const response = await fetch(`${API_URL}/api/alerts/clear`, {
      //   method: 'DELETE',
      // });
      
      // Option 2: Delete alerts one by one
      for (const alert of alerts) {
        await fetch(`${API_URL}/api/alerts/${alert.id}`, {
          method: 'DELETE',
        });
      }
      
      // Refresh the alerts list
      fetchAlerts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${new Date().toISOString()}] Failed to clear alerts:`, errorMessage);
      alert(`Failed to clear alerts: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load default test video
  const loadDefaultTestVideo = () => {
    const testVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    console.log(`[${new Date().toISOString()}] Loading default test video:`, testVideoUrl);
    setVideoUrl(testVideoUrl);
    setLastVideoLoadTime(Date.now());
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
            Search Results {alerts.length > 0 ? `(${alerts.length})` : ''}
            </Typography>
            <Box>
            <Button 
                variant="outlined" 
                onClick={fetchAlerts} 
                disabled={isLoading}
                size="small"
                sx={{ mr: 1 }}
            >
                {isLoading ? 'Refreshing...' : 'Refresh Alerts'}
            </Button>
            <Button 
                variant="outlined" 
                color="warning"
                onClick={deduplicateAlerts}
                size="small"
                sx={{ mr: 1 }}
                disabled={isLoading || alerts.length <= 1}
            >
                Deduplicate
            </Button>
            <Button 
                variant="outlined" 
                color="error"
                onClick={handleClearAlerts} 
                size="small"
                disabled={isLoading || alerts.length === 0}
            >
                Clear All Alerts
            </Button>
            </Box>
        </Box>
        
        {error && (
            <Typography color="error" sx={{ mb: 2 }}>
            {error}
            </Typography>
        )}
        
        {/* Only show "No alerts found" when not loading and no alerts exist */}
        {!isLoading && alerts.length === 0 ? (
            <Typography>No alerts found</Typography>
        ) : (
            <>
            {/* Show/Hide Results Button (only if there are alerts) */}
            {alerts.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: showResults ? 2 : 0 }}>
                <Button 
                    variant="contained"
                    size="small"
                    onClick={toggleShowResults}
                    sx={{ minWidth: '200px' }}
                >
                    {showResults ? 'Hide Results' : `Show ${alerts.length} Search Results`}
                </Button>
                </Box>
            )}
            
            {/* Collapsible Results Table */}
            <Collapse in={showResults}>
                <Table size="small">
                <TableHead>
                    <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Frame #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
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
                        <TableCell>
                        {
                            typeof alert.metadata === 'string'
                            ? JSON.parse(alert.metadata).detectionSequence ?? 'N/A'
                            : alert.metadata?.detectionSequence ?? 'N/A'
                        }
                        </TableCell>
                        <TableCell>{alert.type}</TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>{alert.severity}</TableCell>
                        <TableCell>{alert.status}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </Collapse>
            </>
        )}
        </Paper>

        {/* Stanford Drone Dataset Section */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6">Stanford Drone Dataset</Typography>
          <SampleSelector onSelectSample={handleSelectSample} />
        </Paper>

        {/* File Upload Section */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6">Upload Video</Typography>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Upload failed: {uploadError}
            </Alert>
          )}
          <input type="file" accept="video/*" onChange={handleFileChange} />
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!selectedFile}
            >
              Upload to Server
            </Button>
            {selectedFile && !videoUrl && (
              <Button
                variant="outlined"
                onClick={() => {
                  const url = URL.createObjectURL(selectedFile);
                  setVideoUrl(url);
                  setLastVideoLoadTime(Date.now());
                }}
              >
                Preview Video
              </Button>
            )}
          </Box>
        </Paper>

        {/* Video Analysis Section */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Video Analysis</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                size="small"
                color={debugMode ? "secondary" : "primary"}
                onClick={toggleDebugMode}
              >
                {debugMode ? "Exit Debug Mode" : "Debug Mode"}
              </Button>
              {!videoUrl && (
                <Button 
                  variant="outlined" 
                  size="small"
                  color="primary"
                  onClick={loadDefaultTestVideo}
                >
                  Load Test Video
                </Button>
              )}
            </Box>
          </Box>

          {videoUrl ? (
            debugMode ? (
              // Debug Mode View
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Debug Mode: Video loading can be tested separately from ML processing.
                  If video plays here but not in normal mode, the issue is with the ML processing component.
                </Alert>
                <VideoDebugHelper videoUrl={videoUrl} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                  Video URL loaded at: {new Date(lastVideoLoadTime).toLocaleTimeString()}
                </Typography>
              </Box>
            ) : (
              // Normal Mode with VideoProcessor
              <>
                <VideoProcessor 
                  videoSrc={videoUrl} 
                  onDetection={handleDetectionResults} 
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  If the video doesn't play properly, try switching to Debug Mode to diagnose the issue.
                </Typography>
              </>
            )
          ) : (
            <Typography variant="body2" sx={{ my: 2 }}>
              Please select a sample or upload a video to analyze it for anomalies.
            </Typography>
          )}
        </Paper>

        {/* Detection Results Summary */}
        {processingResults && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Analysis Summary</Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">
                Anomaly Score: {(processingResults.anomalyResult.anomalyScore * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body1">
                Objects Detected: {processingResults.detections.length}
              </Typography>
              <Typography variant="body1">
                Status: {processingResults.anomalyResult.hasAnomaly ? 
                  'Anomaly Detected' : 'Normal Activity'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, fontSize: '0.9rem' }}>
                Next alert can be generated in: {
                  processingResults.anomalyResult.hasAnomaly ? 
                    `${Math.max(0, Math.ceil((globalCooldown + GLOBAL_COOLDOWN - Date.now()) / 1000))} seconds globally` : 
                    'N/A (no anomaly detected)'
                }
              </Typography>
              {processingResults.anomalyResult.hasAnomaly && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Cooldowns by object type:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {Array.from(new Set(processingResults.anomalyResult.anomalies.map(a => a.object))).map(type => {
                      const key = type;
                      const lastTime = alertCooldowns[key] || 0;
                      const remaining = Math.max(0, Math.ceil((lastTime + ALERT_COOLDOWN - Date.now()) / 1000));
                      
                      return (
                        <Chip 
                          key={`cooldown-${key}`}
                          label={`${type}: ${remaining}s`}
                          size="small"
                          color={remaining > 0 ? "default" : "success"}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        )}
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
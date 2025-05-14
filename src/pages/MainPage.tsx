import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
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
  Chip,
  Collapse,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  TableContainer,
  TableSortLabel,
  Pagination,
  LinearProgress
} from '@mui/material';
import AlertDetailModal from '../components/AlertDetailModal';
import VideoProcessor from '../components/VideoProcessor';
import SampleSelector from '../components/SampleSelector';
import { Detection, AnomalyResult } from '../services/DetectionServiceAdapter';

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
  const [filteredAlerts, setFilteredAlerts] = useState<AlertData[]>([]);
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
  
  // Search and filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: '', to: ''});
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showResults, setShowResults] = useState<boolean>(true); // Keep for compatibility
  
  // Pagination
  const [page, setPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{field: string, direction: 'asc' | 'desc'}>({
    field: 'timestamp',
    direction: 'desc'
  });

  // For object detection
  const [detectionCount, setDetectionCount] = useState<number>(0);
  const alertedFrameSet = useRef<Set<number>>(new Set());

  // Simple cooldown
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const ALERT_COOLDOWN = 5000; // 5 seconds between alerts

  const API_URL = 'http://18.117.146.197:4000';

  // Fetch alerts on component mount
  useEffect(() => {
    getAlerts();
  }, []);
  
  // Apply filters and search whenever alerts or filter criteria change
  useEffect(() => {
    // Only filter if we have alerts
    if (alerts.length > 0) {
      filterAlerts();
    } else {
      // If no alerts, ensure filtered alerts is also empty
      setFilteredAlerts([]);
    }
  }, [alerts, searchTerm, dateRange.from, dateRange.to, objectTypeFilter, severityFilter, statusFilter, sortConfig.field, sortConfig.direction]);

  // Function to fetch alerts
  const getAlerts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching alerts...");
      
      const response = await fetch(`${API_URL}/api/alerts`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Alerts data received:", data);
      setAlerts(data);
      
      // Also update filtered alerts immediately
      filterAlertsWithData(data);
      
      setIsLoading(false);
      return data; // Return the data for promise chaining
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to fetch alerts:", errorMessage);
      setError(`Failed to fetch alerts: ${errorMessage}`);
      setAlerts([]);
      setFilteredAlerts([]);
      setIsLoading(false);
      throw err; // Rethrow for promise catching
    }
  };
  
  // Filter alerts based on search criteria using provided data
  const filterAlertsWithData = (alertsData: AlertData[]) => {
    console.log("Filtering with criteria:", {
      searchTerm,
      dateRange,
      objectTypeFilter,
      severityFilter,
      statusFilter
    });
    
    let result = [...alertsData];
    
    // Apply text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(alert => {
        // Search in message
        if (alert.message && alert.message.toLowerCase().includes(term)) return true;
        
        // Search in type
        if (alert.type && alert.type.toLowerCase().includes(term)) return true;
        
        // Search in metadata
        if (alert.metadata) {
          const metadataStr = typeof alert.metadata === 'string' 
            ? alert.metadata 
            : JSON.stringify(alert.metadata);
          
          if (metadataStr.toLowerCase().includes(term)) return true;
        }
        
        return false;
      });
    }
    
    // Apply date filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      result = result.filter(alert => new Date(alert.timestamp) >= fromDate);
    }
    
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      // Set to end of day
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(alert => new Date(alert.timestamp) <= toDate);
    }
    
    // Apply object type filter
    if (objectTypeFilter) {
      result = result.filter(alert => {
        // Check in message
        if (alert.message && alert.message.toLowerCase().includes(objectTypeFilter.toLowerCase())) return true;
        
        // Check in metadata
        if (alert.metadata) {
          const metadataStr = typeof alert.metadata === 'string' 
            ? alert.metadata 
            : JSON.stringify(alert.metadata);
          
          return metadataStr.toLowerCase().includes(objectTypeFilter.toLowerCase());
        }
        
        return false;
      });
    }
    
    // Apply severity filter with exact match
    if (severityFilter) {
      console.log(`Filtering by severity "${severityFilter}"`);
      result = result.filter(alert => {
        const alertSeverity = alert.severity?.toLowerCase() || '';
        const filterSeverity = severityFilter.toLowerCase();
        const matches = alertSeverity === filterSeverity;
        console.log(`  Alert ${alert.id} severity "${alertSeverity}" matches "${filterSeverity}"? ${matches}`);
        return matches;
      });
    }
    
    // Apply status filter with exact match
    if (statusFilter) {
      console.log(`Filtering by status "${statusFilter}"`);
      result = result.filter(alert => {
        const alertStatus = alert.status?.toLowerCase() || '';
        const filterStatus = statusFilter.toLowerCase();
        const matches = alertStatus === filterStatus;
        console.log(`  Alert ${alert.id} status "${alertStatus}" matches "${filterStatus}"? ${matches}`);
        return matches;
      });
    }
    
    console.log(`Filtered from ${alertsData.length} to ${result.length} alerts`);
    
    // Apply sorting
    result.sort((a, b) => {
      let fieldA: any = a[sortConfig.field as keyof AlertData];
      let fieldB: any = b[sortConfig.field as keyof AlertData];
      
      // Handle special case for timestamp
      if (sortConfig.field === 'timestamp') {
        fieldA = new Date(a.timestamp).getTime();
        fieldB = new Date(b.timestamp).getTime();
      }
      
      // Handle undefined values (sort them last)
      if (fieldA === undefined && fieldB === undefined) return 0;
      if (fieldA === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      if (fieldB === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      
      // Compare values
      if (fieldA < fieldB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (fieldA > fieldB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredAlerts(result);
  };
  
  // Filter alerts based on search criteria using current alerts state
  const filterAlerts = () => {
    filterAlertsWithData(alerts);
  };
  
  // Handle search button click
  const handleSearch = () => {
    // Fetch latest alerts first before filtering
    getAlerts().then(() => {
      // After fetching alerts, apply the filters
      filterAlerts();
      setPage(1); // Reset to first page
    });
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDateRange({from: '', to: ''});
    setObjectTypeFilter('');
    setSeverityFilter('');
    setStatusFilter('');
    setPage(1);
  };
  
  // Handle sorting
  const handleSort = (field: string) => {
    setSortConfig({
      field,
      direction: 
        sortConfig.field === field && sortConfig.direction === 'asc' 
          ? 'desc' 
          : 'asc'
    });
  };
  
  // View a specific alert
  const handleViewAlert = (alert: AlertData) => {
    setSelectedAlert(alert);
  };
  
  // Delete a specific alert
  const handleDeleteAlert = async (alertId: number) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/alerts/${alertId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete alert: ${response.statusText}`);
      }
      
      // Update the local alerts list
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to delete alert:", errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      setSelectedFile(file);
      setUploadError(null);
      
      // Create object URL for video preview
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.log("Upload attempted with no file selected");
      return alert("Please select a video file first.");
    }

    console.log("Preparing to upload file:", selectedFile.name);

    const formData = new FormData();
    formData.append('video', selectedFile);

    // Reset any previous upload errors
    setUploadError(null);

    try {
      console.log("Sending upload request");
      
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();
      console.log("Upload successful:", result);
      alert("Upload successful!");
      
      // Create a URL for the uploaded video
      if (result.file && result.file.path) {
        const url = `${API_URL}/${result.file.path}`;
        setVideoUrl(url);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Upload failed:", errorMessage);
      setUploadError(errorMessage);
    }
  };

  const handleRowClick = async (alert: AlertData) => {
    console.log("Alert selected:", alert);
    
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
      console.log("Detailed alert data:", detailedAlert);
      setSelectedAlert(detailedAlert);
    } catch (err) {
      console.error("Failed to fetch alert details:", err);
      // Fall back to basic alert info
      setSelectedAlert(alert);
    }
  };

  const handleCloseModal = () => {
    console.log("Alert detail modal closed");
    setSelectedAlert(null);
  };

  // Handler for sample selection
  const handleSelectSample = (sampleUrl: string) => {
    console.log("Sample selected:", sampleUrl);
    setVideoUrl(sampleUrl);
  };

  // Handler for detection results - create alerts for ALL detections
  const handleDetectionResults = (
    detections: Detection[],
    anomalyResult: AnomalyResult
  ) => {
    setProcessingResults({ detections, anomalyResult });
    
    // Log detection results
    console.log(`Detected ${detections.length} objects`, detections);
  
    const now = Date.now();
    
    // Simple cooldown to prevent too many alerts at once
    if (now - lastAlertTime < ALERT_COOLDOWN) {
      return;
    }
    
    // Create alerts for ANY detections, regardless of anomaly score
    if (detections.length > 0) {
      const video = document.querySelector('video');
      
      if (!video) return;

      // Get actual frame information from the video
      const fps = 30; // Estimate if not available
      const currentTime = video.currentTime;
      const actualFrameNumber = Math.round(currentTime * fps);

      // Create frame capture
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

      // Prepare metadata
      const metadata = {
        detections: detections.map(d => ({
          class: d.class,
          score: d.score
        })),
        anomalies: anomalyResult.anomalies,
        anomalyScore: anomalyResult.anomalyScore,
        videoTime: currentTime,
        frameImage: captureVideoFrame(),
        frameNumber: actualFrameNumber,
        timestamp: new Date().toISOString()
      };
      
      // Get detection types
      const objectTypes = Array.from(new Set(detections.map(d => d.class)));
      
      // Create alert for ALL detections, regardless of anomaly status
      createAlert(
        detections, 
        anomalyResult, 
        metadata,
        `Detected ${detections.length} objects: ${objectTypes.join(', ')}`
      );
      
      // Update cooldown
      setLastAlertTime(now);
      
      // Refresh alerts list after creating a new alert
      setTimeout(() => {
        getAlerts();
      }, 1000); // Wait a second for the alert to be saved
    }
  };

  // Create alert using different severity levels based on anomaly score
  const createAlert = async (
    detections: Detection[],
    anomalyResult: AnomalyResult,
    metadata: any = {},
    message: string
  ) => {
    try {
      const now = new Date();
      const timestampStr = now.toISOString();
  
      console.log("Creating alert for detection with message:", message);
      
      // Determine severity based on anomaly score
      let severity = 'low';
      if (anomalyResult.anomalyScore > 0.7) {
        severity = 'critical';
      } else if (anomalyResult.anomalyScore > 0.5) {
        severity = 'high';
      } else if (anomalyResult.anomalyScore > 0.3) {
        severity = 'medium';
      }
      
      // Post the alert without any additional checks
      const response = await fetch(`${API_URL}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: timestampStr,
          type: 'Object Detection',
          message: message,
          severity: severity,
          status: 'new',
          metadata
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to create alert');
      }
  
      const data = await response.json();
      console.log("Alert created:", data);
      
      // No automatic refresh here - we'll do it after a timeout
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Alert creation failed:", errorMessage);
    }
  };

  // Clear all alerts
  const handleClearAlerts = async () => {
    if (!window.confirm("Are you sure you want to clear all alerts? This cannot be undone.")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Delete alerts one by one
      for (const alert of alerts) {
        await fetch(`${API_URL}/api/alerts/${alert.id}`, {
          method: 'DELETE',
        });
      }
      
      // Refresh the alerts list
      getAlerts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to clear alerts:", errorMessage);
      alert(`Failed to clear alerts: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle debug mode
  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
    console.log("Debug mode:", !debugMode ? 'enabled' : 'disabled');
  };
  
  // Toggle showing results
  const toggleShowResults = () => {
    setShowResults(!showResults);
    console.log("Debug mode:", !debugMode ? 'enabled' : 'disabled');
  };

  return (
    <>
      <Container sx={{ py: 4 }}>
        {/* Search Section */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Search Criteria</Typography>
          
          <Box sx={{ mb: 3 }}>
            <TextField 
              fullWidth 
              label="Search" 
              placeholder="Search by object type, anomaly type, or description..." 
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              {/* Date Range Filter */}
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="subtitle2" gutterBottom>Date Range</Typography>
                <TextField
                  type="date"
                  size="small"
                  label="From"
                  InputLabelProps={{ shrink: true }}
                  value={dateRange.from}
                  onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                  sx={{ mr: 1, mb: 1 }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="To"
                  InputLabelProps={{ shrink: true }}
                  value={dateRange.to}
                  onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                />
              </Box>
              
              {/* Object Type Filter */}
              <Box sx={{ minWidth: 150 }}>
                <Typography variant="subtitle2" gutterBottom>Object Type</Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={objectTypeFilter}
                    onChange={(e) => setObjectTypeFilter(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="pedestrian">Pedestrian</MenuItem>
                    <MenuItem value="car">Car</MenuItem>
                    <MenuItem value="bicycle">Bicycle</MenuItem>
                    <MenuItem value="bus">Bus</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Severity Filter */}
              <Box sx={{ minWidth: 150 }}>
                <Typography variant="subtitle2" gutterBottom>Severity</Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">All Severities</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Status Filter */}
              <Box sx={{ minWidth: 150 }}>
                <Typography variant="subtitle2" gutterBottom>Status</Typography>
                <FormControl size="small" fullWidth>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="investigating">Investigating</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="false_alarm">False Alarm</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained" 
                onClick={handleSearch}
              >
                Search
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleResetFilters}
              >
                Clear Filters
              </Button>
            </Box>
          </Box>
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
                onClick={getAlerts} 
                disabled={isLoading}
                size="small"
                sx={{ mr: 1 }}
              >
                {isLoading ? 'Refreshing...' : 'Refresh Alerts'}
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
                    {filteredAlerts.map((alert) => (
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
                              ? JSON.parse(alert.metadata).frameNumber ?? 'N/A'
                              : alert.metadata?.frameNumber ?? 'N/A'
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
          <Typography variant="h6">Sample Videos</Typography>
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
            <Typography variant="h6">Video Analysis with Object Detection</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                size="small"
                color={debugMode ? "secondary" : "primary"}
                onClick={toggleDebugMode}
              >
                {debugMode ? "Exit Debug Mode" : "Debug Mode"}
              </Button>
            </Box>
          </Box>

          {videoUrl ? (
            <VideoProcessor 
              videoSrc={videoUrl} 
              onDetection={handleDetectionResults} 
            />
          ) : (
            <Typography variant="body2" sx={{ my: 2 }}>
              Please select a sample or upload a video to analyze it for anomalies.
            </Typography>
          )}
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
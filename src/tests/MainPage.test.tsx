// MainPage.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainPage from '../pages/MainPage';
import { Detection, AnomalyResult } from '../services/YOLOObjectDetectionService';

// Mock the child components
jest.mock('../components/AlertDetailModal', () => ({
  __esModule: true,
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="alert-detail-modal" data-open={String(open)}>
      <button data-testid="close-modal-button" onClick={onClose}>Close</button>
    </div>
  ),
}));

jest.mock('../components/VideoProcessor', () => ({
  __esModule: true,
  default: ({ videoSrc, onDetection }: { videoSrc: string; onDetection: (detections: any[], anomalyResult: any) => void }) => (
    <div data-testid="video-processor" data-video-src={videoSrc}>
      <button 
        data-testid="trigger-detection-button" 
        onClick={() => {
          const mockDetections = [
            { class: 'person', score: 0.95, bbox: [10, 10, 100, 200] }
          ];
          const mockAnomalyResult = {
            hasAnomaly: true,
            anomalyScore: 0.85,
            anomalies: [
              { object: 'person', score: 0.85, bbox: [10, 10, 100, 200] }
            ]
          };
          onDetection(mockDetections, mockAnomalyResult);
        }}
      >
        Trigger Detection
      </button>
    </div>
  ),
}));

jest.mock('../components/SampleSelector', () => ({
  __esModule: true,
  default: ({ onSelectSample }: { onSelectSample: (url: string) => void }) => (
    <div data-testid="sample-selector">
      <button 
        data-testid="select-sample-button" 
        onClick={() => onSelectSample('https://example.com/sample-video.mp4')}
      >
        Select Sample
      </button>
    </div>
  ),
}));

jest.mock('../components/VideoDebugHelper', () => ({
  __esModule: true,
  default: ({ videoUrl }: { videoUrl: string }) => (
    <div data-testid="video-debug-helper" data-video-url={videoUrl}></div>
  ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.Mock;

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock window.alert
global.alert = jest.fn();

// Define interface for alert data to match your component
interface AlertData {
  id: number;
  timestamp: string;
  type: string;
  message: string;
  severity?: string;
  status?: string;
  metadata?: any;
}

describe('MainPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [] as AlertData[],
      text: async () => '',
      status: 200,
      statusText: 'OK'
    });
  });

  test('renders without crashing', async () => {
    // Use await act for initial render since it triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Initial fetch should be called
    expect(mockFetch).toHaveBeenCalledWith(
      'http://18.117.146.197:4000/api/alerts',
      expect.any(Object)
    );
    
    // Main sections should be visible
    expect(screen.getByText('Search Criteria')).toBeInTheDocument();
    expect(screen.getByText('Search Results')).toBeInTheDocument();
    expect(screen.getByText('Stanford Drone Dataset')).toBeInTheDocument();
    expect(screen.getByText('Upload Video')).toBeInTheDocument();
    expect(screen.getByText('Video Analysis')).toBeInTheDocument();
  });

  test('fetches alerts on mount', async () => {
    const mockAlerts: AlertData[] = [
      { id: 1, timestamp: '2023-01-01T12:00:00Z', type: 'ML Detection', message: 'Detected person', severity: 'high', status: 'new' },
      { id: 2, timestamp: '2023-01-02T12:00:00Z', type: 'ML Detection', message: 'Detected car', severity: 'medium', status: 'new' }
    ];
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
      status: 200,
      statusText: 'OK'
    });
    
    // Use await act for the initial render that triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Wait for the fetch to complete and verify it was called
    expect(mockFetch).toHaveBeenCalledWith(
      'http://18.117.146.197:4000/api/alerts',
      expect.any(Object)
    );
    
    // Click to show results - wrap in act since it changes state
    await act(async () => {
      fireEvent.click(screen.getByText('Show 2 Search Results'));
    });
    
    // Alert data should be visible in the table
    expect(screen.getByText('Detected person')).toBeInTheDocument();
    expect(screen.getByText('Detected car')).toBeInTheDocument();
  });

  test('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    // Use await act for the initial render that triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Error should be displayed
    expect(screen.getByText(/Failed to fetch alerts/)).toBeInTheDocument();
  });


  test('toggles debug mode', async () => {
    // Use await act for the initial render that triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Debug mode should be off initially
    expect(screen.queryByTestId('video-debug-helper')).not.toBeInTheDocument();
    
    // Turn on debug mode - wrap in act since it updates state
    await act(async () => {
      fireEvent.click(screen.getByText('Debug Mode'));
    });
    
    // Load a test video - wrap in act since it updates state
    await act(async () => {
      fireEvent.click(screen.getByText('Load Test Video'));
    });
    
    // Debug helper should be visible
    expect(screen.getByTestId('video-debug-helper')).toBeInTheDocument();
    
    // Turn off debug mode - wrap in act since it updates state
    await act(async () => {
      fireEvent.click(screen.getByText('Exit Debug Mode'));
    });
    
    // Video processor should be visible
    expect(screen.getByTestId('video-processor')).toBeInTheDocument();
  });

  test('selects sample video', async () => {
    // Use await act for the initial render that triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Click select sample button - wrap in act since it updates state
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-sample-button'));
    });
    
    // Video url should be set and passed to VideoProcessor
    expect(screen.getByTestId('video-processor')).toHaveAttribute('data-video-src', 'https://example.com/sample-video.mp4');
  });

  // Replace the 'handles detection results and creates alerts' test with this fixed version

test('handles detection results and creates alerts', async () => {
  // Mock console.error to prevent test output noise
  const originalConsoleError = console.error;
  console.error = jest.fn();

  // Mock successful alerts fetch
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [],
    status: 200,
    statusText: 'OK'
  });
  
  // Use await act for the initial render that triggers fetch
  await act(async () => {
    render(<MainPage />);
  });
  
  // Load a test video
  await act(async () => {
    fireEvent.click(screen.getByText('Load Test Video'));
  });
  
  // Reset fetch mock to track new calls
  mockFetch.mockClear();
  
  // Important: This is where the error happens - need to mock the fetch for existing alerts
  // When the alert is created, your component fetches existing alerts first to check for duplicates
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [], // Return empty array for existing alerts check
    status: 200,
    statusText: 'OK'
  });
  
  // Mock response for alert creation
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id: 1, success: true }),
    status: 200,
    statusText: 'OK'
  });
  
  // Mock for getting updated alerts after creation
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { 
        id: 1, 
        timestamp: '2023-01-01T12:00:00Z', 
        type: 'ML Detection', 
        message: 'Detected person', 
        severity: 'high', 
        status: 'new',
        metadata: { detectionSequence: 1 }
      }
    ],
    status: 200,
    statusText: 'OK'
  });
  
  // Trigger detection
  await act(async () => {
    fireEvent.click(screen.getByTestId('trigger-detection-button'));
    
    // Manually wait to ensure async operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  // Get the fetch calls made after reset
  const fetchCalls = mockFetch.mock.calls;
  
  // Should have made at least 3 fetch calls (get alerts, create alert, refresh alerts)
  expect(fetchCalls.length).toBeGreaterThanOrEqual(3);
  
  // Check that one of the fetch calls was a POST to create an alert
  const createAlertCall = fetchCalls.find(call => 
    call[0] === 'http://18.117.146.197:4000/api/alerts' && 
    call[1]?.method === 'POST'
  );
  
  // Verify alert creation API was called
  expect(createAlertCall).toBeTruthy();
  
  // If you want to be more specific, you can check the body contains expected data
  if (createAlertCall) {
    expect(createAlertCall[1].body).toContain('ML Detection');
  }
  
  // Restore console.error
  console.error = originalConsoleError;
});

  test('opens and closes alert detail modal', async () => {
    const mockAlerts = [
      { id: 1, timestamp: '2023-01-01T12:00:00Z', type: 'ML Detection', message: 'Detected person', severity: 'high', status: 'new' }
    ];
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
      status: 200,
      statusText: 'OK'
    });
    
    // Use await act for the initial render that triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Mock for alert detail fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockAlerts[0], metadata: { detections: [] } }),
      status: 200,
      statusText: 'OK'
    });
    
    // Click to show results - wrap in act since it changes state
    await act(async () => {
      fireEvent.click(screen.getByText('Show 1 Search Results'));
    });
    
    // Click on alert row - wrap in act since it triggers fetch and state updates
    await act(async () => {
      fireEvent.click(screen.getByText('Detected person'));
    });
    
    // Modal should be open
    const modal = screen.getByTestId('alert-detail-modal');
    expect(modal).toHaveAttribute('data-open', 'true');
    
    // Close modal - wrap in act since it updates state
    await act(async () => {
      fireEvent.click(screen.getByTestId('close-modal-button'));
    });
    
    // Modal should be closed
    expect(modal).toHaveAttribute('data-open', 'false');
  });

  test('deduplicates alerts', async () => {
    const mockAlerts = [
      { id: 1, timestamp: '2023-01-01T12:00:00Z', type: 'ML Detection', message: 'Detected person', severity: 'high', status: 'new' },
      { id: 2, timestamp: '2023-01-02T12:00:00Z', type: 'ML Detection', message: 'Detected person', severity: 'high', status: 'new' }
    ];
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
      status: 200,
      statusText: 'OK'
    });
    
    window.confirm = jest.fn().mockReturnValue(true);
    
    // Use await act for the initial render that triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Reset mock before the action
    mockFetch.mockClear();
    
    // Mock for deduplication process
    // Mocking in sequence for the 3 needed fetch calls
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
      status: 200,
      statusText: 'OK'
    });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockAlerts[0]],
      status: 200,
      statusText: 'OK'
    });
    
    // Click deduplicate button - wrap in act since it triggers fetch and state updates
    await act(async () => {
      fireEvent.click(screen.getByText('Deduplicate'));
      
      // Manually wait to ensure async operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Should confirm
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('duplicate alerts'));
    
    // Get all fetch calls after we cleared the mock
    const fetchCalls = mockFetch.mock.calls;
    
    // Find the DELETE call
    const deleteCall = fetchCalls.find(call => 
      call[0].includes('/api/alerts/') && 
      call[1]?.method === 'DELETE'
    );
    
    // Verify a delete call was made
    expect(deleteCall).toBeTruthy();
  });

  test('clears all alerts', async () => {
    const mockAlerts = [
      { id: 1, timestamp: '2023-01-01T12:00:00Z', type: 'ML Detection', message: 'Detected person', severity: 'high', status: 'new' },
      { id: 2, timestamp: '2023-01-02T12:00:00Z', type: 'ML Detection', message: 'Detected car', severity: 'medium', status: 'new' }
    ];
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAlerts,
      status: 200,
      statusText: 'OK'
    });
    
    window.confirm = jest.fn().mockReturnValue(true);
    
    // Use await act for the initial render that triggers fetch
    await act(async () => {
      render(<MainPage />);
    });
    
    // Reset mock to track just the calls we're interested in
    mockFetch.mockClear();
    
    // Mock successful delete calls and final empty result
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK'
    });
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
      status: 200,
      statusText: 'OK'
    });
    
    // Click clear all button - wrap in act since it triggers fetch and state updates
    await act(async () => {
      fireEvent.click(screen.getByText('Clear All Alerts'));
      
      // Manually wait to ensure async operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Should confirm
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('clear all alerts'));
    
    // Get all fetch calls after clearing the mock
    const fetchCalls = mockFetch.mock.calls;
    
    // Check that at least one DELETE call was made
    const deleteCall = fetchCalls.find(call => 
      call[1]?.method === 'DELETE'
    );
    
    expect(deleteCall).toBeTruthy();
    
    // Should show no alerts
    expect(screen.getByText('No alerts found')).toBeInTheDocument();
  });
});
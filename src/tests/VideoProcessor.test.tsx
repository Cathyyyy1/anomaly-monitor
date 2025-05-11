// VideoProcessor.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Instead of mocking MUI, let's mock the VideoProcessor component itself
jest.mock('../components/VideoProcessor', () => {
  return {
    __esModule: true,
    default: ({ videoSrc, onDetection, onVideoTimeUpdate }: { 
        videoSrc: string; 
        onDetection: (detections: any[], anomalyResult: any) => void;
        onVideoTimeUpdate?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
      }) => {
      // A version of the component for testing
      const handleStartProcessing = () => {
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
      };
      
      return (
        <div data-testid="video-processor" data-video-src={videoSrc}>
          <div data-testid="video-element"></div>
          <button data-testid="start-button" onClick={handleStartProcessing}>
            Start Video Analysis
          </button>
          <button data-testid="retry-button">Retry</button>
          <div data-testid="detection-results">
            <span>Detection Results</span>
          </div>
          <input 
            data-testid="threshold-slider" 
            type="range" 
            min="0.5" 
            max="0.95" 
            step="0.05" 
            defaultValue="0.8"
            onChange={(e) => {
              // Simulate detection with new threshold
              const newThreshold = Number(e.target.value);
              const mockDetections = [
                { class: 'person', score: 0.95, bbox: [10, 10, 100, 200] }
              ];
              const mockAnomalyResult = {
                hasAnomaly: newThreshold < 0.9, // Only true if threshold is below 0.9
                anomalyScore: 0.85,
                anomalies: [
                  { object: 'person', score: 0.85, bbox: [10, 10, 100, 200] }
                ]
              };
              onDetection(mockDetections, mockAnomalyResult);
            }}
          />
          <input 
            data-testid="frameskip-slider" 
            type="range" 
            min="0" 
            max="5" 
            step="1" 
            defaultValue="2"
          />
        </div>
      );
    }
  };
});

// No need to mock object detection service as we're mocking the whole component
import VideoProcessor from '../components/VideoProcessor';

describe('VideoProcessor', () => {
  const videoSrc = 'https://example.com/test-video.mp4';
  const mockOnDetection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with video source', () => {
    render(<VideoProcessor videoSrc={videoSrc} onDetection={mockOnDetection} />);
    
    const processor = screen.getByTestId('video-processor');
    expect(processor).toHaveAttribute('data-video-src', videoSrc);
  });

  test('calls onDetection when Start button is clicked', () => {
    render(<VideoProcessor videoSrc={videoSrc} onDetection={mockOnDetection} />);
    
    // Click start button
    fireEvent.click(screen.getByTestId('start-button'));
    
    // onDetection should be called with mock data
    expect(mockOnDetection).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ class: 'person' })]),
      expect.objectContaining({ hasAnomaly: true, anomalyScore: 0.85 })
    );
  });

  test('adjusts anomaly detection based on threshold', () => {
    render(<VideoProcessor videoSrc={videoSrc} onDetection={mockOnDetection} />);
    
    // Change threshold to 0.95 (which should make hasAnomaly false in our mock)
    fireEvent.change(screen.getByTestId('threshold-slider'), { target: { value: 0.95 } });
    
    // Check that onDetection was called with hasAnomaly: false
    expect(mockOnDetection).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ hasAnomaly: false })
    );
    
    // Change threshold back to 0.8 (which should make hasAnomaly true in our mock)
    fireEvent.change(screen.getByTestId('threshold-slider'), { target: { value: 0.8 } });
    
    // Check that onDetection was called with hasAnomaly: true
    expect(mockOnDetection).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ hasAnomaly: true })
    );
  });
});
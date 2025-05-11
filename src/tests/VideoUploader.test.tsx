// Fixed VideoUploader.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoUploader from '../components/VideoUploader';

// Mock console errors to reduce noise
const originalConsoleError = console.error;
console.error = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('VideoUploader', () => {
  // Define our props and mocks
  const mockOnVideoSelect = jest.fn();
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    // Restore console.error after all tests
    console.error = originalConsoleError;
  });

  test('renders without crashing', () => {
    render(<VideoUploader onVideoSelect={mockOnVideoSelect} />);
    
    // Check that the component renders correctly
    expect(screen.getByText('Upload Your Own Video')).toBeInTheDocument();
    expect(screen.getByText('Select Video')).toBeInTheDocument();
  });

  test('handles file selection for valid video file', () => {
    render(<VideoUploader onVideoSelect={mockOnVideoSelect} />);
    
    // Create a mock video file
    const file = new File(['dummy content'], 'test-video.mp4', { type: 'video/mp4' });
    
    // Get the file input and simulate file selection
    const input = screen.getByLabelText(/Select Video/i).closest('label')?.querySelector('input');
    expect(input).toBeInTheDocument();
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Check that the file information is displayed
    expect(screen.getByText(/test-video.mp4/)).toBeInTheDocument();
    expect(screen.getByText(/Use This Video/)).toBeInTheDocument();
    expect(screen.getByText(/Clear/)).toBeInTheDocument();
  });

  test('shows error for non-video file', () => {
    render(<VideoUploader onVideoSelect={mockOnVideoSelect} />);
    
    // Create a mock non-video file
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    
    // Get the file input and simulate file selection
    const input = screen.getByLabelText(/Select Video/i).closest('label')?.querySelector('input');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Check that error message is displayed
    expect(screen.getByText(/Please select a valid video file/)).toBeInTheDocument();
  });

  test('clears selected file when Clear button is clicked', () => {
    render(<VideoUploader onVideoSelect={mockOnVideoSelect} />);
    
    // First, select a file
    const file = new File(['dummy content'], 'test-video.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText(/Select Video/i).closest('label')?.querySelector('input');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Verify file is selected
    expect(screen.getByText(/test-video.mp4/)).toBeInTheDocument();
    
    // Click the Clear button
    fireEvent.click(screen.getByText(/Clear/));
    
    // Check that file information is no longer displayed
    expect(screen.queryByText(/test-video.mp4/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Use This Video/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Clear/)).not.toBeInTheDocument();
  });

  test('calls onVideoSelect when Use This Video button is clicked', async () => {
    // Ensure URL.createObjectURL returns our mock URL
    (global.URL.createObjectURL as jest.Mock).mockReturnValue('blob:mock-url');

    render(<VideoUploader onVideoSelect={mockOnVideoSelect} />);
    
    // First, select a file
    const file = new File(['dummy content'], 'test-video.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText(/Select Video/i).closest('label')?.querySelector('input');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Click the Use This Video button - wrap in act() for state updates
    await act(async () => {
      fireEvent.click(screen.getByText(/Use This Video/));
    });
    
    // Check that URL.createObjectURL was called with the file
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
    
    // Check that onVideoSelect was called with the correct URL
    expect(mockOnVideoSelect).toHaveBeenCalledWith('blob:mock-url');
  });

  // Better approach for testing the error case without mocking internal implementation
  test('Use This Video button is only visible when a file is selected', () => {
    render(<VideoUploader onVideoSelect={mockOnVideoSelect} />);
    
    // Initially, the button should not be visible
    expect(screen.queryByText('Use This Video')).not.toBeInTheDocument();
    
    // Select a file
    const file = new File(['dummy content'], 'test-video.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText(/Select Video/i).closest('label')?.querySelector('input');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Now the button should be visible
    expect(screen.getByText('Use This Video')).toBeInTheDocument();
    
    // Clear the selection
    fireEvent.click(screen.getByText('Clear'));
    
    // Button should be hidden again
    expect(screen.queryByText('Use This Video')).not.toBeInTheDocument();
  });

  test('shows error when URL.createObjectURL fails', async () => {
    // Mock URL.createObjectURL to throw an error
    (global.URL.createObjectURL as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Failed to create object URL');
    });

    
    render(<VideoUploader onVideoSelect={mockOnVideoSelect} />);
    
    // First, select a file
    const file = new File(['dummy content'], 'test-video.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText(/Select Video/i).closest('label')?.querySelector('input');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    // Click the Use This Video button - wrap in act() for state updates
    await act(async () => {
      fireEvent.click(screen.getByText(/Use This Video/));
    });
    
    // Check that error is displayed
    expect(screen.getByText(/Failed to process video file/)).toBeInTheDocument();
    
    // Check that onVideoSelect was not called
    expect(mockOnVideoSelect).not.toHaveBeenCalled();
  });
});
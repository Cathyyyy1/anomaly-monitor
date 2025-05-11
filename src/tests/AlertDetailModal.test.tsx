// AlertDetailModal.test.tsx - Simplified version with MUI mocks
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlertDetailModal from '../components/AlertDetailModal';

// Mock MUI Dialog components
jest.mock('@mui/material/Dialog', () => ({
    __esModule: true,
    default: ({ children, open, onClose }: { 
      children: React.ReactNode; 
      open: boolean; 
      onClose?: (event: {}, reason: string) => void 
    }) => (
      open ? (
        <div data-testid="mock-dialog">
          {children}
          <button 
            data-testid="mock-dialog-close" 
            onClick={() => onClose && onClose({}, 'escapeKeyDown')}
            aria-label="close"
          >
            Close
          </button>
          <div 
            data-testid="mock-dialog-backdrop" 
            onClick={() => onClose && onClose({}, 'backdropClick')}
          />
        </div>
      ) : null
    )
  }));

jest.mock('@mui/material/DialogTitle', () => ({
__esModule: true,
default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
)
}));
  

jest.mock('@mui/material/DialogContent', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dialog-content">{children}</div>
    )
  }));

describe('AlertDetailModal', () => {
  const mockOnClose = jest.fn();
  
  // Sample alert data
  const mockAlert = {
    id: 1,
    timestamp: '2023-01-01T12:00:00Z',
    type: 'ML Detection',
    message: 'Detected person'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders null when alert is null', () => {
    const { container } = render(
      <AlertDetailModal
        open={true}
        onClose={mockOnClose}
        alert={null}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  test('renders alert details when open and alert is provided', () => {
    render(
      <AlertDetailModal
        open={true}
        onClose={mockOnClose}
        alert={mockAlert}
      />
    );
    
    // Check dialog title
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Alert Details');
    
    // Check alert properties
    expect(screen.getByText(/ID:/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Time:/)).toBeInTheDocument();
    expect(screen.getByText('2023-01-01T12:00:00Z')).toBeInTheDocument();
    expect(screen.getByText(/Type:/)).toBeInTheDocument();
    expect(screen.getByText('ML Detection')).toBeInTheDocument();
    expect(screen.getByText(/Message:/)).toBeInTheDocument();
    expect(screen.getByText('Detected person')).toBeInTheDocument();
  });

  test('does not render when open is false', () => {
    render(
      <AlertDetailModal
        open={false}
        onClose={mockOnClose}
        alert={mockAlert}
      />
    );
    
    expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <AlertDetailModal
        open={true}
        onClose={mockOnClose}
        alert={mockAlert}
      />
    );
    
    fireEvent.click(screen.getByTestId('mock-dialog-close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when backdrop is clicked', () => {
    render(
      <AlertDetailModal
        open={true}
        onClose={mockOnClose}
        alert={mockAlert}
      />
    );
    
    fireEvent.click(screen.getByTestId('mock-dialog-backdrop'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
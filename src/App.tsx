// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainPage from './pages/MainPage';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';

const App: React.FC = () => {
  return (
    <Router>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0' }}>
          <Container>
            <Toolbar sx={{ flexWrap: 'wrap' }}>
              <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
                Anomaly Detection System
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Only keeping the Main App navigation item */}
                <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  Main App
                </a>
                {/* Video Test Page link removed */}
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
        <Box sx={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<MainPage />} />
            {/* Video Test Page route removed */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
};

export default App;
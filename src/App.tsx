import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MainPage from './pages/MainPage';
import VideoTestPage from './components/VideoTest';

function App() {
  return (
    <Router>
      {/* Simple navigation for debugging */}
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '10px' }}>
        <Link to="/" style={{ marginRight: '20px' }}>Main App</Link>
        <Link to="/video-test">Video Test Page</Link>
      </div>
      
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/video-test" element={<VideoTestPage />} />
      </Routes>
    </Router>
  );
}

export default App;
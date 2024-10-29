import React, { useState } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadType, setDownloadType] = useState('video'); // 'video' or 'audio'

  const getVideoInfo = async () => {
    console.log('🔍 Fetching video info for URL:', url);
    try {
      setError(null);
      setIsLoading(true);
      console.log('📡 Making API request to:', `http://localhost:5000/api/video-info?url=${encodeURIComponent(url)}`);

      const response = await fetch(`http://localhost:5000/api/video-info?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      console.log('📥 Received response:', {
        status: response.status,
        data: data
      });

      if (!response.ok) throw new Error(data.error);
      setVideoInfo(data);
      console.log('✅ Video info updated successfully');
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch video info';
      console.error('❌ Error fetching video info:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 Request completed');
    }
  };

  const downloadContent = async (type) => {
    console.log(`📥 Starting ${type} download for URL:`, url);
    try {
      setError(null);
      setDownloadProgress(0);

      const downloadUrl = `http://localhost:5000/api/download?url=${encodeURIComponent(url)}&type=${type}`;
      console.log('🔗 Download URL:', downloadUrl);

      // Create a hidden anchor tag for download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${videoInfo.title}.${type === 'audio' ? 'mp3' : 'mp4'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Start progress polling
      const pollProgress = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/download-progress`);
          const data = await response.json();
          setDownloadProgress(data.progress);

          if (data.progress === 100 || data.status === 'completed') {
            clearInterval(pollProgress);
            setDownloadProgress(null);
          }
        } catch (err) {
          console.error('Error polling progress:', err);
        }
      }, 1000);

      console.log('✅ Download initiated');
    } catch (err) {
      console.error('❌ Error initiating download:', err);
      setError(err.message || 'Failed to start download');
      setDownloadProgress(null);
    }
  };

  console.log('🔄 Current state:', {
    url,
    videoInfo,
    error,
    isLoading
  });

  return (
    <div className="App">
      <div className="container">
        <h1>YouTube Video Downloader</h1>

        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter YouTube Video URL"
            className="url-input"
          />
          <button
            onClick={getVideoInfo}
            disabled={isLoading}
            className="button"
          >
            {isLoading ? 'Loading...' : 'Get Info'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {videoInfo && (
          <div className="video-info">
            <h2>Video Information</h2>
            <p><strong>Title:</strong> {videoInfo.title}</p>
            <p><strong>Author:</strong> {videoInfo.author}</p>
            <p><strong>Duration:</strong> {videoInfo.lengthSeconds} seconds</p>

            <div className="download-options">
              <button
                onClick={() => downloadContent('video')}
                disabled={downloadProgress !== null}
                className="button download-button"
              >
                Download Video
              </button>
              <button
                onClick={() => downloadContent('audio')}
                disabled={downloadProgress !== null}
                className="button download-button audio"
              >
                Download Audio Only
              </button>
            </div>

            {downloadProgress !== null && (
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${downloadProgress}%` }}
                />
                <span className="progress-text">
                  {downloadProgress.toFixed(1)}% Downloaded
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

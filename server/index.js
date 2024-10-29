const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();

app.use(cors());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`\n📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('📋 Query params:', req.query);
  next();
});

app.get('/api/video-info', async (req, res) => {
  console.log('🎥 Fetching video info...');
  try {
    const { url } = req.query;
    if (!url) {
      console.log('❌ No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('🔍 Getting info for URL:', url);
    const info = await ytdl.getInfo(url);

    const responseData = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
    };

    console.log('✅ Successfully retrieved video info:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching video info:', error);
    res.status(500).json({
      error: 'Failed to fetch video info',
      details: error.message
    });
  }
});

// Add this near the top to track download progress
const downloadProgress = new Map();

app.get('/api/download-progress', (req, res) => {
  const progress = downloadProgress.get(req.ip) || 0;
  res.json({ progress, status: progress === 100 ? 'completed' : 'downloading' });
});

app.get('/api/download', async (req, res) => {
  console.log('📥 Starting download...');
  try {
    const { url, type } = req.query;
    if (!url) {
      console.log('❌ No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('🔍 Getting info for download:', url);
    const info = await ytdl.getInfo(url);

    console.log(`📦 Starting ${type} download for:`, info.videoDetails.title);

    // Set appropriate headers
    res.header('Content-Type', type === 'audio' ? 'audio/mp3' : 'video/mp4');
    res.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(info.videoDetails.title)}.${type === 'audio' ? 'mp3' : 'mp4'}"`
    );

    // Set timeout to 1 hour
    res.setTimeout(3600000);

    const options = {
      quality: type === 'audio' ? 'highestaudio' : 'highest',
      filter: type === 'audio' ? 'audioonly' : 'audioandvideo',
    };

    const stream = ytdl(url, options);

    // Track progress
    let downloadedBytes = 0;
    const contentLength = info.videoDetails.lengthSeconds * (type === 'audio' ? 32000 : 100000); // Rough estimate

    downloadProgress.set(req.ip, 0);

    stream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const progress = Math.min((downloadedBytes / contentLength) * 100, 100);
      downloadProgress.set(req.ip, progress);
      console.log(`📊 Downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB (${progress.toFixed(2)}%)`);
    });

    stream.on('end', () => {
      console.log('✅ Download completed');
      downloadProgress.set(req.ip, 100);
      setTimeout(() => downloadProgress.delete(req.ip), 5000);
    });

    stream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      downloadProgress.delete(req.ip);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Stream error occurred',
          details: error.message
        });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log('🔌 Client disconnected');
      downloadProgress.delete(req.ip);
      stream.destroy();
    });

    // Pipe the stream to response
    stream.pipe(res);

  } catch (error) {
    console.error('❌ Error during download:', error);
    downloadProgress.delete(req.ip);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to download',
        details: error.message
      });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
📍 API endpoints:
   - GET /api/video-info
   - GET /api/download
  `);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('🔥 Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
}); 
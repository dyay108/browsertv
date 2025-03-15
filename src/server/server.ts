import express, { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3100;

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/probe', (req: Request, res: Response) => {
  res.json({ message: 'ffmpeg media probing' });
});

// Proxy configuration for PocketBase
app.use('/api/collections', createProxyMiddleware({
  target: 'http://127.0.0.1:8090', // PocketBase URL
  changeOrigin: true,
  pathRewrite: {
    '^/pb': '', // Remove /pb prefix when forwarding
  },
}));

// In production, serve the React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
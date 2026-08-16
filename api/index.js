// Vercel API handler — forward requests to the Express app
import app from '../server.js';

export default function handler(req, res) {
  return app(req, res);
}

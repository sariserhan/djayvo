import { analyzeContext } from './session-analysis.js';
self.onmessage = ({ data }) => {
  try { self.postMessage({ result: analyzeContext(data.samples, data.rate) }); }
  catch (error) { self.postMessage({ error: error.message }); }
  self.close();
};

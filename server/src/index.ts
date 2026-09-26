import { app } from './app.js';
import { ENV } from './config/env.js';

app.listen(ENV.PORT, () => {
  console.log(`🚀 MULTILLM Core active on port ${ENV.PORT}`);
});
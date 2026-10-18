import { loadEnv } from 'vite'
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env }
// Public release identifiers only. Runtime Firebase config still comes from env.
const approved = {
  VITE_FIREBASE_PROJECT_ID: 'breake-the-rules',
  VITE_FIREBASE_AUTH_DOMAIN: 'breake-the-rules.firebaseapp.com',
  VITE_FIREBASE_APP_ID: '1:330692718529:web:a9b24b70cdfe2a7c980940',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '330692718529',
  VITE_API_BASE_URL: 'https://br-api-916064977717.asia-southeast1.run.app',
  VITE_DATA_MODE: 'http',
}
for (const [key, value] of Object.entries(approved)) {
  if (env[key] !== value)
    throw new Error('Invalid approved production configuration: ' + key)
}
if (env.VITE_FIREBASE_EMULATORS && env.VITE_FIREBASE_EMULATORS !== 'false')
  throw new Error('Emulators cannot be enabled in production.')
const key = env.VITE_FIREBASE_API_KEY ?? ''
if (
  !/^AIza[\w-]{35}$/.test(key) ||
  /YOUR|REPLACE|PLACEHOLDER|EXAMPLE|DEMO/i.test(key)
)
  throw new Error('Missing, malformed or placeholder Firebase API key.')
console.log('Production public configuration validated (values not printed).')

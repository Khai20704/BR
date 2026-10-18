import { initializeApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const env = import.meta.env
export const firebaseConfigured = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
].every((key) => Boolean(env[key]))
const app = firebaseConfigured
  ? (getApps()[0] ??
    initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    }))
  : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
if (env.DEV && env.VITE_FIREBASE_EMULATORS === 'true' && auth && db) {
  if (!String(env.VITE_FIREBASE_PROJECT_ID).startsWith('demo-'))
    throw new Error('Emulators require a demo- project ID.')
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8085)
}

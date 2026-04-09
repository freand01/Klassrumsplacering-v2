import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Om vi kör bygget via Electron-kommandot används './', annars används '/Klassrumsplacering-v2/' för din GitHub-sida.
export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : '/Klassrumsplacering-v2/', 
  plugins: [react()],
})
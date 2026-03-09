import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Byt ut namnet nedan till EXAKT det namn du gav ditt repository på GitHub
export default defineConfig({
  base: '/Klassrumsplacering-v2/', 
  plugins: [react()],
})
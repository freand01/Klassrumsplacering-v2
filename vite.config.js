import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Byt ut namnet nedan till EXAKT det namn du gav ditt repository på GitHub
export default defineConfig({
  base: '/klassplacering-v2/', 
  plugins: [react()],
})
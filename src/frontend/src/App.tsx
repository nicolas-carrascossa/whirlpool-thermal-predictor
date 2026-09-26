import { Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/authStore'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { HomePage } from '@/pages/Home'
import { LoginPage } from '@/pages/Login'
import { StyleguidePage } from '@/pages/Styleguide'
import { ThermalMapDevPage } from '@/pages/ThermalMapDev'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/styleguide" element={<StyleguidePage />} />
        <Route path="/dev/thermal-map" element={<ThermalMapDevPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

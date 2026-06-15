import { useCallback, useEffect, useState, type ReactNode } from "react"

import * as api from "./api"
import { AuthContext, type AuthContextValue } from "./auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .refresh()
      .then((tokens) => {
        setAccessToken(tokens.access_token)
        return api.getCurrentUser(tokens.access_token)
      })
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api.login(email, password)
    setAccessToken(tokens.access_token)
    setUser(await api.getCurrentUser(tokens.access_token))
  }, [])

  const register = useCallback(
    async (email: string, password: string) => {
      await api.register(email, password)
      await login(email, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
    setAccessToken(null)
  }, [])

  const value: AuthContextValue = { user, accessToken, loading, login, register, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

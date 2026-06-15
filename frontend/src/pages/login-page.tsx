import { Link, useNavigate } from "react-router-dom"

import { AuthForm } from "@/components/auth-form"
import { useAuth } from "@/lib/auth-context"

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  return (
    <AuthForm
      title="Welcome back"
      description="Log in to your Enriq account"
      submitLabel="Log in"
      onSubmit={async (email, password) => {
        await login(email, password)
        navigate("/workspaces")
      }}
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="underline">
            Register
          </Link>
        </p>
      }
    />
  )
}

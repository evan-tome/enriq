import { Link, useNavigate } from "react-router-dom"

import { AuthForm } from "@/components/auth-form"
import { useAuth } from "@/lib/auth-context"

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  return (
    <AuthForm
      title="Create an account"
      description="Get started with Enriq"
      submitLabel="Register"
      onSubmit={async (email, password) => {
        await register(email, password)
        navigate("/workspaces")
      }}
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="underline">
            Log in
          </Link>
        </p>
      }
    />
  )
}

import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"

export function ProfilePage() {
  const { user, logout } = useAuth()
  const initial = user?.email ? user.email[0].toUpperCase() : "?"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account information.</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-base font-medium">
              {initial}
            </span>
            <span>{user?.email}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={() => void logout()}>
            <LogOut />
            Log out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

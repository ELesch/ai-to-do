"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Forgot password form validation schema
 */
const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

/**
 * Forgot Password Page
 * Handles password reset requests
 */
export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setError(null)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(
          errorData.message || "Failed to send reset email. Please try again."
        )
        return
      }

      setSubmittedEmail(data.email)
      setIsSuccess(true)
    } catch {
      setError("An unexpected error occurred. Please try again.")
    }
  }

  // Success state
  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Mail className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-foreground">{submittedEmail}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center text-sm">
            If you don&apos;t see the email, check your spam folder. The link
            will expire in 1 hour.
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsSuccess(false)
              setSubmittedEmail("")
            }}
          >
            Try a different email
          </Button>
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="text-primary inline-flex items-center text-sm hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // Form state
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="text-primary inline-flex items-center text-sm hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}

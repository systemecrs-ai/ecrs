// src/app/login/page.tsx

import LoginForm from "@/components/auth/LoginPage";

// This works here because there is no 'use client' directive
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm />;
}
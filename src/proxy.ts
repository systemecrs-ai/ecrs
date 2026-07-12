import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = await updateSession(request)

  // Protect API routes
  if (
    request.nextUrl.pathname.startsWith('/api/chat') ||
    request.nextUrl.pathname.startsWith('/api/ingest')
  ) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    }

    // Inject the user ID into the headers for downstream routes
    supabaseResponse.headers.set('X-User-Id', user.id)
  }

  return supabaseResponse
} 

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

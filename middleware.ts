// middleware.ts
// Middleware for Next.js App Router
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return NextResponse.next({
    request,
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};

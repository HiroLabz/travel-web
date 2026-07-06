import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = '__session';

export async function verifyAuth(): Promise<{ authenticated: boolean }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return { authenticated: !!sessionCookie?.value };
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized - Please log in' },
    { status: 401 }
  );
}

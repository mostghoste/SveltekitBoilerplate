import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { session, role }, cookies }) => {
  return {
    session,
    role,
    cookies: cookies.getAll(),
  }
}
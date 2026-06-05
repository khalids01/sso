import { treaty } from '@elysiajs/eden'
import type { App } from '../../../server'
import { env } from "@env/client";

export const client = treaty<App>(env.VITE_SERVER_URL, {
  fetch: {
    credentials: 'include'
  }
})

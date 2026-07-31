import { Polar } from '@polar-sh/sdk'
import { env } from '@sso/env/server'

const polar = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: env.POLAR_MODE || 'sandbox' // sandbox or production
})

async function run() {
    const result = await polar.benefits.list({})
    for await (const page of result) {
        // Handle the page
        console.log(page)
    }
}

run()
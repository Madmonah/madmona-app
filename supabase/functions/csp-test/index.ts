import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(() => {
  return new Response(`<!DOCTYPE html><html><head><title>CSP Test</title></head><body><h1 style="color:red">Hello</h1></body></html>`, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; style-src 'self' https: 'unsafe-inline'; script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; font-src 'self' https: data:; img-src 'self' https: data:;"
    }
  })
})
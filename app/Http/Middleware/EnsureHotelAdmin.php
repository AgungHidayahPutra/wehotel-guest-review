<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHotelAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        // Fail closed: pengguna belum login / bukan admin mendapat 403.
        abort_unless($request->user() && (bool) $request->user()->is_admin, 403);

        return $next($request);
    }
}

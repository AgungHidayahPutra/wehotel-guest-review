@include('errors.layout', [
    'code' => isset($exception) && method_exists($exception, 'getStatusCode') ? $exception->getStatusCode() : 400,
])

enum FailureCode {
  unauthenticated,
  permissionDenied,
  invalidArgument,
  idempotencyConflict,
  unavailable,
  timeout,
  resourceExhausted,
  currencyMismatch,
  moneyOverflow,
  ambiguousTime,
  nonexistentTime,
  configuration,
  unknown,
}

final class AppFailure implements Exception {
  const AppFailure(this.code, {this.correlationId});
  final FailureCode code;
  final String? correlationId;

  bool get retryable =>
      code == FailureCode.unavailable || code == FailureCode.timeout;

  /// Never exposes untrusted server error text or a raw request payload.
  String get userMessage => switch (code) {
    FailureCode.unauthenticated =>
      'Tu sesión no está disponible. Inicia sesión para continuar.',
    FailureCode.permissionDenied =>
      'No tienes permiso para esta acción. Consulta con el dueño del negocio.',
    FailureCode.invalidArgument =>
      'Algunos datos no son válidos. Revísalos y vuelve a intentarlo.',
    FailureCode.idempotencyConflict =>
      'Esta solicitud cambió durante el envío. Revisa su estado antes de iniciar una nueva.',
    FailureCode.unavailable =>
      'No se pudo conectar con el servidor. Comprueba tu conexión y reintenta.',
    FailureCode.timeout =>
      'El servidor tardó demasiado. Reintenta la misma solicitud para comprobar su resultado.',
    FailureCode.resourceExhausted =>
      'Hay demasiadas solicitudes. Espera un momento y vuelve a intentarlo.',
    FailureCode.currencyMismatch =>
      'Los importes pertenecen a monedas distintas. Selecciona un solo mercado para continuar.',
    FailureCode.moneyOverflow =>
      'El importe supera el límite admitido. Revisa el valor antes de continuar.',
    FailureCode.ambiguousTime =>
      'Esta hora se repite por el cambio de horario. Selecciona cuál de las dos corresponde.',
    FailureCode.nonexistentTime =>
      'Esta hora no existe por el cambio de horario. Selecciona otra hora del local.',
    FailureCode.configuration =>
      'Falta configurar este entorno. Revisa la configuración Firebase de la variante.',
    FailureCode.unknown =>
      'No se pudo completar la comprobación. Reintenta y conserva la referencia si vuelve a fallar.',
  };

  factory AppFailure.fromServer(String code, {String? correlationId}) =>
      AppFailure(switch (code.toUpperCase().replaceAll('-', '_')) {
        'UNAUTHENTICATED' => FailureCode.unauthenticated,
        'PERMISSION_DENIED' || 'FORBIDDEN' => FailureCode.permissionDenied,
        'INVALID_ARGUMENT' ||
        'BAD_REQUEST' ||
        'TIME_INVALID' => FailureCode.invalidArgument,
        'MONEY_CURRENCY_MISMATCH' => FailureCode.currencyMismatch,
        'MONEY_OVERFLOW' => FailureCode.moneyOverflow,
        'TIME_AMBIGUOUS' => FailureCode.ambiguousTime,
        'TIME_NONEXISTENT' => FailureCode.nonexistentTime,
        'IDEMPOTENCY_CONFLICT' => FailureCode.idempotencyConflict,
        'UNAVAILABLE' => FailureCode.unavailable,
        'DEADLINE_EXCEEDED' => FailureCode.timeout,
        'RESOURCE_EXHAUSTED' => FailureCode.resourceExhausted,
        _ => FailureCode.unknown,
      }, correlationId: correlationId);
}

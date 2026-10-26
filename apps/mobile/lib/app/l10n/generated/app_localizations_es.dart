// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AppLocalizationsEs extends AppLocalizations {
  AppLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get appTitle => 'Lazo';

  @override
  String get foundationTitle => 'Fundamentos de Lazo';

  @override
  String get foundationBody =>
      'La base técnica está preparada. Los recorridos de clientes, profesionales y dueños se incorporarán en los siguientes pasos.';

  @override
  String get demoLabel => 'DEMO · emuladores locales';

  @override
  String get diagnostics => 'Diagnóstico';

  @override
  String get checkConnection => 'Comprobar conexión';

  @override
  String get checkingConnection => 'Comprobando conexión…';

  @override
  String get session => 'Sesión';

  @override
  String get sessionPending =>
      'El inicio de sesión se implementará en el Paso 3.';

  @override
  String get goHome => 'Volver al inicio';

  @override
  String get configurationRequired => 'Falta configurar este entorno';

  @override
  String get configurationHelp =>
      'Revisa el archivo de configuración de la variante y los identificadores del proyecto Firebase.';

  @override
  String get connectionReady => 'Servidor disponible';

  @override
  String get retry => 'Reintentar';

  @override
  String get environment => 'Entorno';

  @override
  String get serverVersion => 'Versión del servidor';

  @override
  String get serverTime => 'Hora del servidor (UTC)';

  @override
  String get correlation => 'Referencia de diagnóstico';

  @override
  String get project => 'Proyecto';

  @override
  String get locale => 'Idioma y región';

  @override
  String get notAvailable =>
      'Esta sección estará disponible en un paso posterior.';

  @override
  String get unknownRoute =>
      'La pantalla no existe. Vuelve al inicio para continuar.';
}

/// The translations for Spanish Castilian, as used in Spain (`es_ES`).
class AppLocalizationsEsEs extends AppLocalizationsEs {
  AppLocalizationsEsEs() : super('es_ES');

  @override
  String get appTitle => 'Lazo';

  @override
  String get sessionPending =>
      'El inicio de sesión se implementará en el Paso 3.';
}

/// The translations for Spanish Castilian, as used in Peru (`es_PE`).
class AppLocalizationsEsPe extends AppLocalizationsEs {
  AppLocalizationsEsPe() : super('es_PE');

  @override
  String get appTitle => 'Lazo';

  @override
  String get sessionPending =>
      'El inicio de sesión se implementará en el Paso 3.';
}

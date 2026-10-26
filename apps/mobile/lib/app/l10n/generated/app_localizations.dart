import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_es.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'generated/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('es'),
    Locale('es', 'ES'),
    Locale('es', 'PE'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In es, this message translates to:
  /// **'Lazo'**
  String get appTitle;

  /// No description provided for @foundationTitle.
  ///
  /// In es, this message translates to:
  /// **'Fundamentos de Lazo'**
  String get foundationTitle;

  /// No description provided for @foundationBody.
  ///
  /// In es, this message translates to:
  /// **'La base técnica está preparada. Los recorridos de clientes, profesionales y dueños se incorporarán en los siguientes pasos.'**
  String get foundationBody;

  /// No description provided for @demoLabel.
  ///
  /// In es, this message translates to:
  /// **'DEMO · emuladores locales'**
  String get demoLabel;

  /// No description provided for @diagnostics.
  ///
  /// In es, this message translates to:
  /// **'Diagnóstico'**
  String get diagnostics;

  /// No description provided for @checkConnection.
  ///
  /// In es, this message translates to:
  /// **'Comprobar conexión'**
  String get checkConnection;

  /// No description provided for @checkingConnection.
  ///
  /// In es, this message translates to:
  /// **'Comprobando conexión…'**
  String get checkingConnection;

  /// No description provided for @session.
  ///
  /// In es, this message translates to:
  /// **'Sesión'**
  String get session;

  /// No description provided for @sessionPending.
  ///
  /// In es, this message translates to:
  /// **'El inicio de sesión se implementará en el Paso 3.'**
  String get sessionPending;

  /// No description provided for @goHome.
  ///
  /// In es, this message translates to:
  /// **'Volver al inicio'**
  String get goHome;

  /// No description provided for @configurationRequired.
  ///
  /// In es, this message translates to:
  /// **'Falta configurar este entorno'**
  String get configurationRequired;

  /// No description provided for @configurationHelp.
  ///
  /// In es, this message translates to:
  /// **'Revisa el archivo de configuración de la variante y los identificadores del proyecto Firebase.'**
  String get configurationHelp;

  /// No description provided for @connectionReady.
  ///
  /// In es, this message translates to:
  /// **'Servidor disponible'**
  String get connectionReady;

  /// No description provided for @retry.
  ///
  /// In es, this message translates to:
  /// **'Reintentar'**
  String get retry;

  /// No description provided for @environment.
  ///
  /// In es, this message translates to:
  /// **'Entorno'**
  String get environment;

  /// No description provided for @serverVersion.
  ///
  /// In es, this message translates to:
  /// **'Versión del servidor'**
  String get serverVersion;

  /// No description provided for @serverTime.
  ///
  /// In es, this message translates to:
  /// **'Hora del servidor (UTC)'**
  String get serverTime;

  /// No description provided for @correlation.
  ///
  /// In es, this message translates to:
  /// **'Referencia de diagnóstico'**
  String get correlation;

  /// No description provided for @project.
  ///
  /// In es, this message translates to:
  /// **'Proyecto'**
  String get project;

  /// No description provided for @locale.
  ///
  /// In es, this message translates to:
  /// **'Idioma y región'**
  String get locale;

  /// No description provided for @notAvailable.
  ///
  /// In es, this message translates to:
  /// **'Esta sección estará disponible en un paso posterior.'**
  String get notAvailable;

  /// No description provided for @unknownRoute.
  ///
  /// In es, this message translates to:
  /// **'La pantalla no existe. Vuelve al inicio para continuar.'**
  String get unknownRoute;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['es'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when language+country codes are specified.
  switch (locale.languageCode) {
    case 'es':
      {
        switch (locale.countryCode) {
          case 'ES':
            return AppLocalizationsEsEs();
          case 'PE':
            return AppLocalizationsEsPe();
        }
        break;
      }
  }

  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'es':
      return AppLocalizationsEs();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}

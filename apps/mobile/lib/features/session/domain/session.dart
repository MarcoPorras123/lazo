import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppRole { customer, barber, owner }

/// Placeholder, deliberately grants no membership. Step 3 will read server scope.
final class SessionSnapshot {
  const SessionSnapshot.signedOut() : uid = null, role = null;
  const SessionSnapshot({required this.uid, required this.role});
  final String? uid;
  final AppRole? role;
  bool get isSignedIn => uid != null;
}

final sessionProvider = Provider<SessionSnapshot>(
  (ref) => const SessionSnapshot.signedOut(),
);

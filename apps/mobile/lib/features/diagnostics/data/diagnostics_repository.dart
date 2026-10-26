import '../../../core/networking/callable_client.dart';
import '../domain/ping_response.dart';

final class DiagnosticsRepository {
  DiagnosticsRepository(this.client);
  final CallableClient client;

  Future<PingResponse> ping() async =>
      PingResponse.fromJson(await client.invoke('system-ping', const {}));
}

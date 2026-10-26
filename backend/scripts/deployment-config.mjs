const targets = ['dev', 'staging', 'prod'];

export function validateDeployment({ target, aliases, config, envText, productionRelease }) {
  if (!targets.includes(target)) throw new Error('Entorno no válido.');
  const projects = targets.map(name => aliases[name]);
  if (projects.some(id => typeof id !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(id) || id.startsWith('demo-'))) {
    throw new Error('Registrar tres IDs reales de Firebase antes de desplegar.');
  }
  if (new Set(projects).size !== 3) throw new Error('dev, staging y prod deben ser proyectos diferentes.');
  if (targets.some(name => config.projects?.[name] !== aliases[name])) throw new Error('Los tres aliases deben coincidir con la configuración aprobada.');
  if (config.dataRegionApproved !== true || !config.functionsRegion || !config.firestoreLocation) throw new Error('Aprobar región de datos antes del despliegue.');
  if (config.appCheckConfigured !== true || config.iamConfigured !== true) throw new Error('Completar App Check e IAM.');
  const values = {};
  for (const line of envText.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]*)=([^\r\n]*)$/.exec(line.trim());
    if (!match || Object.hasOwn(values, match[1])) throw new Error('Archivo de parámetros ambiguo o inválido.');
    const value = match[2].trim();
    values[match[1]] = /^(".*"|'.*')$/.test(value) ? value.slice(1, -1) : value;
  }
  const project = aliases[target];
  if (values.LAZO_ENV !== target || values.LAZO_REGION !== config.functionsRegion) throw new Error('Parámetros desplegables no coinciden con entorno/región aprobados.');
  if (!values.LAZO_VERSION || values.LAZO_VERSION.length > 64) throw new Error('Versión de Functions requerida.');
  for (const key of ['LAZO_SYSTEM_SERVICE_ACCOUNT', 'LAZO_WORKER_SERVICE_ACCOUNT']) {
    if (!values[key]?.endsWith(`@${project}.iam.gserviceaccount.com`) || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]@/.test(values[key])) {
      throw new Error('Las cuentas de servicio deben pertenecer al proyecto elegido.');
    }
  }
  if (values.LAZO_SYSTEM_SERVICE_ACCOUNT === values.LAZO_WORKER_SERVICE_ACCOUNT) throw new Error('Separar la cuenta de ping de los workers.');
  if (target === 'prod' && productionRelease !== project) throw new Error('Producción requiere LAZO_PRODUCTION_RELEASE igual al ID aprobado.');
  return Object.freeze({ project, target });
}

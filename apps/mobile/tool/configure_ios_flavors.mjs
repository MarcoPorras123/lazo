// Reproducible transformation of the Flutter 3.47.8 iOS template.
// Run once after generating a new template, not after manually changing configs.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(mobile, 'ios/Runner.xcodeproj/project.pbxproj');
let text = fs.readFileSync(project, 'utf8').replaceAll('\r\n', '\n');
if (text.includes('/* Debug-dev */')) {
  throw new Error('Flavor configurations already exist; no files changed.');
}
const id = (name) => createHash('sha256').update(`lazo:${name}`).digest('hex').slice(0, 24).toUpperCase();
const configs = [
  { owner: 'project', list: '97C146E91CF9000F007C117D',
    Debug: '97C147031CF9000F007C117D', Release: '97C147041CF9000F007C117D', Profile: '249021D3217E4FDB00AE95B9' },
  { owner: 'app', list: '97C147051CF9000F007C117D',
    Debug: '97C147061CF9000F007C117D', Release: '97C147071CF9000F007C117D', Profile: '249021D4217E4FDB00AE95B9' },
  { owner: 'tests', list: '331C8087294A63A400263BE5',
    Debug: '331C8088294A63A400263BE5', Release: '331C8089294A63A400263BE5', Profile: '331C808A294A63A400263BE5' },
];
let newConfigurations = '';
let newFileReferences = '';
let newGroupReferences = '';
for (const flavor of ['dev', 'staging', 'prod']) {
  const bundle = `app.lazo.mobile${flavor === 'prod' ? '' : `.${flavor}`}`;
  for (const mode of ['Debug', 'Release', 'Profile']) {
    const configName = `${mode}-${flavor}`;
    const configFileId = id(`file:${configName}`);
    const base = mode === 'Debug' ? 'Debug' : 'Release';
    fs.writeFileSync(path.join(mobile, `ios/Flutter/${configName}.xcconfig`),
      `#include "${base}.xcconfig"\n// Select lib/main_${flavor}.dart via Flutter --target.\nLAZO_ENV = ${flavor}\nAPP_DISPLAY_NAME = Lazo${flavor === 'prod' ? '' : ` ${flavor.toUpperCase()}`}\n`);
    newFileReferences += `\t\t${configFileId} /* ${configName}.xcconfig */ = {isa = PBXFileReference; lastKnownFileType = text.xcconfig; name = "${configName}.xcconfig"; path = "Flutter/${configName}.xcconfig"; sourceTree = "<group>"; };\n`;
    newGroupReferences += `\t\t\t\t${configFileId} /* ${configName}.xcconfig */,\n`;
    for (const config of configs) {
      const originalId = config[mode];
      const pattern = new RegExp(`\\t\\t${originalId} /\\* ${mode} \\*/ = \\{[\\s\\S]*?^\\t\\t\\};`, 'm');
      const original = text.match(pattern)?.[0];
      if (!original) throw new Error(`Missing template configuration ${originalId}`);
      const cloneId = id(`${config.owner}:${configName}`);
      let clone = original.replace(originalId, cloneId)
        .replace(`/* ${mode} */`, `/* ${configName} */`)
        .replace(`name = ${mode};`, `name = "${configName}";`);
      if (config.owner === 'app') {
        clone = clone.replace(/baseConfigurationReference = [^;]+;/,
          `baseConfigurationReference = ${configFileId} /* ${configName}.xcconfig */;`)
          .replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/, `PRODUCT_BUNDLE_IDENTIFIER = ${bundle};`)
          .replace('INFOPLIST_FILE = Runner/Info.plist;',
            `INFOPLIST_FILE = Runner/${flavor === 'dev' ? 'Info-dev' : 'Info'}.plist;`);
        if (flavor !== 'dev') {
          clone = clone.replace('buildSettings = {', 'buildSettings = {\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = Runner/AppCheck.entitlements;');
        }
      } else if (config.owner === 'tests') {
        clone = clone.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/,
          `PRODUCT_BUNDLE_IDENTIFIER = ${bundle}.RunnerTests;`);
      }
      newConfigurations += `${clone}\n`;
      const listPattern = new RegExp(`(\\t\\t${config.list} /\\*[^\\n]+\\n\\t\\t\\tisa = XCConfigurationList;\\n\\t\\t\\tbuildConfigurations = \\()`);
      if (!listPattern.test(text)) throw new Error(`Missing config list ${config.list}`);
      text = text.replace(listPattern, `$1\n\t\t\t\t${cloneId} /* ${configName} */,`);
    }
  }
  const schemePath = path.join(mobile, 'ios/Runner.xcodeproj/xcshareddata/xcschemes');
  const baseScheme = fs.readFileSync(path.join(schemePath, 'Runner.xcscheme'), 'utf8');
  fs.writeFileSync(path.join(schemePath, `${flavor}.xcscheme`),
    baseScheme.replaceAll('buildConfiguration = "Debug"', `buildConfiguration = "Debug-${flavor}"`)
      .replaceAll('buildConfiguration = "Profile"', `buildConfiguration = "Profile-${flavor}"`)
      .replaceAll('buildConfiguration = "Release"', `buildConfiguration = "Release-${flavor}"`));
}
text = text.replace('/* End XCBuildConfiguration section */', `${newConfigurations}/* End XCBuildConfiguration section */`)
  .replace('/* End PBXFileReference section */', `${newFileReferences}/* End PBXFileReference section */`)
  .replace('\t\t\t\t9740EEB31CF90195004384FC /* Generated.xcconfig */,',
    `\t\t\t\t9740EEB31CF90195004384FC /* Generated.xcconfig */,\n${newGroupReferences}`);

for (const [name, script] of [['Crashlytics symbols', 'upload-crashlytics'], ['Firebase configuration', 'prepare-firebase']]) {
  const phaseId = id(`phase:${name}`);
  const phase = `\t\t${phaseId} /* ${name} */ = {\n\t\t\tisa = PBXShellScriptBuildPhase;\n\t\t\talwaysOutOfDate = 1;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = ();\n\t\t\tinputPaths = ();\n\t\t\tname = "${name}";\n\t\t\toutputPaths = ();\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t\tshellPath = /bin/sh;\n\t\t\tshellScript = "/bin/sh \\\"$PROJECT_DIR/scripts/${script}.sh\\\"";\n\t\t};\n`;
  text = text.replace('/* End PBXShellScriptBuildPhase section */', `${phase}/* End PBXShellScriptBuildPhase section */`)
    .replace('\t\t\t\t3B06AD1E1E4923F5004D2608 /* Thin Binary */,',
      `\t\t\t\t3B06AD1E1E4923F5004D2608 /* Thin Binary */,\n\t\t\t\t${phaseId} /* ${name} */,`);
}
// The unflavored template remains a development target; release always uses --flavor.
text = text.replaceAll('app.lazo.lazoMobile', 'app.lazo.mobile.dev');
fs.writeFileSync(project, text);
for (const mode of ['Debug', 'Release']) {
  fs.appendFileSync(path.join(mobile, `ios/Flutter/${mode}.xcconfig`),
    '\nLAZO_ENV = dev\nAPP_DISPLAY_NAME = Lazo DEV\n');
}
const info = fs.readFileSync(path.join(mobile, 'ios/Runner/Info.plist'), 'utf8').replaceAll('\r\n', '\n');
fs.writeFileSync(path.join(mobile, 'ios/Runner/Info-dev.plist'), info.replace('</dict>\n</plist>',
  '\t<key>NSAppTransportSecurity</key>\n\t<dict><key>NSAllowsLocalNetworking</key><true/></dict>\n</dict>\n</plist>'));
console.log('Generated 27 iOS flavor configurations and three shared schemes.');

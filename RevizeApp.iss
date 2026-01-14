[Setup]
AppId={{12345678-1234-1234-1234-123456789012}
AppName=RevizeApp
AppVersion=1.0.0
AppPublisher=RevizeApp
AppPublisherURL=https://revizeapp.cz
AppSupportURL=https://revizeapp.cz
AppUpdatesURL=https://revizeapp.cz
DefaultDirName={autopf}\RevizeApp
DefaultGroupName=RevizeApp
AllowNoIcons=yes
LicenseFile=LICENSE.txt
OutputDir=release
OutputBaseFilename=RevizeApp-1.0.0-setup
SetupIconFile=electron\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "czech"; MessagesFile: "compiler:Languages\Czech.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 0,6.1

[Files]
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "server\*"; DestDir: "{app}\server"; Flags: ignoreversion recursesubdirs createallsubdirs excludes: "node_modules,data"
Source: "launcher.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion

[Dirs]
Name: "{app}\server\data"
Name: "{app}\server\node_modules"

[Icons]
Name: "{group}\RevizeApp"; Filename: "{app}\launcher.bat"; WorkingDir: "{app}"; IconFilename: "{app}\electron\icon.ico"
Name: "{group}\{cm:UninstallProgram,RevizeApp}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\RevizeApp"; Filename: "{app}\launcher.bat"; WorkingDir: "{app}"; IconFilename: "{app}\electron\icon.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\RevizeApp"; Filename: "{app}\launcher.bat"; WorkingDir: "{app}"; IconFilename: "{app}\electron\icon.ico"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\launcher.bat"; Description: "Spustit RevizeApp"; Flags: shellexec postinstall skipifsilent; WorkingDir: "{app}"

[UninstallDelete]
Type: dirifempty; Name: "{app}"
Type: dirifempty; Name: "{app}\dist"
Type: dirifempty; Name: "{app}\server"

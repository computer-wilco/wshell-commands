import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

const binDir = join(homedir(), '.w-shell/bin');
const packageListUrl = "https://raw.githubusercontent.com/computer-wilco/wshell-commands/master/packages.json";

// Zorg dat de map bestaat
if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
}

// Download en parse de package list
async function fetchPackages() {
    const res = await fetch(packageListUrl);
    return res.json();
}

// Installeer een pakket
async function installPackage(packageName) {
    const packages = await fetchPackages();

    if (!(packageName in packages)) {
        console.log(`❌ Pakket '${packageName}' niet gevonden.`);
        return;
    }

    const pkg = packages[packageName];

    if (!pkg.platforms.includes(platform())) {
        console.log(`❌ Dit pakket is niet beschikbaar voor ${platform()}.`);
        return;
    }

    const filePath = join(binDir, packageName + (platform() === 'win32' ? '.bat' : ''));
    const script = await fetch(pkg.url).then(res => res.text());

    writeFileSync(filePath, script, { mode: 0o755 });
    console.log(`✅ Pakket '${packageName}' geïnstalleerd.`);
}

// Verwijder een pakket
function removePackage(packageName) {
    const filePath = join(binDir, packageName + (platform() === 'win32' ? '.bat' : ''));
    if (existsSync(filePath)) {
        unlinkSync(filePath);
        console.log(`🗑️ Pakket '${packageName}' verwijderd.`);
    } else {
        console.log(`❌ Pakket '${packageName}' is niet geïnstalleerd.`);
    }
}

// Toon lijst van geïnstalleerde pakketten
function listPackages() {
    console.log("📦 Geïnstalleerde pakketten:");
    execSync(`ls ${binDir}`, { stdio: 'inherit', shell: platform() === 'win32' ? 'powershell.exe' : process.env.SHELL });
}

// CLI-interface
const [,, command, packageName] = process.argv;

switch (command) {
    case "install":
        installPackage(packageName);
        break;
    case "remove":
        removePackage(packageName);
        break;
    case "list":
        listPackages();
        break;
    default:
        console.log("🔹 Gebruik: wpm install <pakket>, wpm remove <pakket>, wpm list");
}

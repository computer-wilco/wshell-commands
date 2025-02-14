const { ensureDirSync, writeFileSync, chmodSync, existsSync, unlinkSync, readdirSync, readFileSync } = require('fs-extra');
const { get } = require('axios');
const { join } = require('path');
const { homedir, platform } = require('os');

const REPO_URL = "https://raw.githubusercontent.com/computer-wilco/wshell-commands/master/packages.json";
const INSTALL_DIR = join(homedir(), '.w-shell/bin');
const PACKAGE_FILE = join(homedir(), '.w-shell/packages.json');

// Zorg dat de installatiemap en package-bestand bestaan
ensureDirSync(INSTALL_DIR);
ensureDirSync(join(homedir(), '.w-shell'));

if (!existsSync(PACKAGE_FILE)) {
    writeFileSync(PACKAGE_FILE, JSON.stringify({}));
}

// Haal de lijst met pakketten op
async function fetchPackages(useCache = true) {
    if (useCache && existsSync(PACKAGE_FILE)) {
        try {
            return JSON.parse(readFileSync(PACKAGE_FILE, 'utf8'));
        } catch (error) {
            console.error("Fout bij lezen van de lokale cache:", error);
        }
    }

    // Als er geen cache is of we willen updaten, haal online data op
    try {
        const response = await get(REPO_URL);
        writeFileSync(PACKAGE_FILE, JSON.stringify(response.data, null, 2)); // Sla op
        return response.data;
    } catch (error) {
        console.error("Fout bij het ophalen van de pakketten:", error);
        return {};
    }
}

// Installeer een pakket
async function installPackage(packageName) {
    const packages = await fetchPackages();
    const pkg = packages[packageName];

    if (!pkg) {
        console.log(`Pakket '${packageName}' niet gevonden.`);
        return;
    }

    // Kies de juiste URL op basis van het platform
    const packageUrl = platform() === 'win32' && pkg['url-win'] ? pkg['url-win'] : pkg.url;

    if (!packageUrl) {
        console.log(`Geen geschikte download-URL gevonden voor '${packageName}' op ${platform()}.`);
        return;
    }

    const filePath = join(INSTALL_DIR, packageName + (platform() === 'win32' ? '.bat' : ''));

    try {
        const file = await get(packageUrl, { responseType: 'arraybuffer' });
        writeFileSync(filePath, file.data);
        chmodSync(filePath, 0o755); // Maak uitvoerbaar op Unix-systemen
        console.log(`'${packageName}' geïnstalleerd.'`);
    } catch (error) {
        console.error(`Fout bij installeren van '${packageName}':`, error);
    }
}

// Verwijder een pakket
async function removePackage(packageName) {
    const filePath = join(INSTALL_DIR, packageName);

    if (existsSync(filePath)) {
        unlinkSync(filePath);
        console.log(`'${packageName}' verwijderd.`);
    } else {
        console.log(`Pakket '${packageName}' is niet geïnstalleerd.`);
    }
}

// Toon de lijst van beschikbare en geïnstalleerde pakketten
async function listPackages() {
    const packages = await fetchPackages();
    const installedFiles = readdirSync(INSTALL_DIR);
    
    console.log("Beschikbare pakketten:");
    for (const [name, pkg] of Object.entries(packages)) {
        console.log(`- ${name}: ${pkg.description} (${pkg.platforms.join(", ")})`);
    }

    console.log("\nGeïnstalleerde pakketten:");
    installedFiles.forEach(file => console.log(`- ${file}`));
}

async function updatePackages() {
    console.log("Bezig met bijwerken van de pakketlijst...");
    await fetchPackages(false); // Haal de nieuwste versie op
    console.log("Pakketlijst bijgewerkt!");
}

// Command-line interface
const [,, command, packageName] = process.argv;

(async () => {
    switch (command) {
        case 'install':
            if (!packageName) return console.log("Geef een pakketnaam op.");
            await installPackage(packageName);
            break;
        case 'remove':
            if (!packageName) return console.log("Geef een pakketnaam op.");
            await removePackage(packageName);
            break;
        case 'list':
            await listPackages();
            break;
        case 'update':
            await updatePackages();
            break;
        default:
            console.log("Gebruik: wpm install <pakket> | wpm remove <pakket> | wpm list | wpm update");
    }
})();

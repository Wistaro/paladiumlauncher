/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const AdmZip = require('adm-zip');
const child_process = require('child_process');
const crypto = require('crypto');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const { Library }  = require('./assetmanager')
const ConfigManager = require('./configmanager');
const DistroManager = require('./distromanager');
const LoggerUtil = require('./loggerutil');

const logger = LoggerUtil('%c[ProcessBuilder]', 'color: #003996; font-weight: bold')

class ProcessBuilder {
    constructor(instance, versionData, forgeData, authUser) {
        this.gameDir = path.join(ConfigManager.getInstanceDirectory(), instance.getID());
        this.commonDir = ConfigManager.getCommonDirectory();

        this.instance = instance;
        this.versionData = versionData;
        this.forgeData = forgeData;
        this.authUser = authUser;

        this.libPath = path.join(this.commonDir, 'libraries');
    }

    _getFiles(dir, files_) {
        files_ = files_ || [];
        if(fs.existsSync(dir)) {
            var files = fs.readdirSync(dir);
            for(var i in files) {
                var name = dir + '/' + files[i];
                if(fs.statSync(name).isDirectory()) {
                    this._getFiles(name, files_);
                } 
                else {
                    files_.push(name);
                }
            }
        }
        return files_;
    }

    _checkFile(file, files) {
        for(let f of files) {
            let v1 = this.replaceAll(f, '/', '\\');
            let v2 = this.replaceAll(file, '/', '\\');

            if(this.replaceAll(f, '/', '\\').includes(this.replaceAll(file, '/', '\\'))) {
                return true;
            }
        }
        return false;
    }

    replaceAll(str, find, replace) {
        return str.split(find).join(replace);
    }
    
    build() {
        let files_ex = [];
        files_ex = files_ex.concat(this._getFiles(ConfigManager.getInstanceDirectory()));

        let files = [];

        for(let ign of this.instance.getIgnored()) {
            files.push(path.join(this.gameDir, ign.path));
        }

        for(let file of this._getFiles(path.join(this.gameDir, "config"))) {
            files.push(file);
        }

        for(let file of this._getFiles(path.join(this.gameDir, "resourcepacks"))) {
            files.push(file);
        }
        
        for(let file of this._getFiles(path.join(this.gameDir, "shaderpacks"))) {
            files.push(file);
        }

        const instances = DistroManager.getDistribution().getInstances();
        for(let inst of instances) {
            for(let mdl of inst.getModules()) {
                files.push(mdl.getArtifact().getPath());
                
                if(mdl.hasSubModules()) {
                    for(let sm of mdl.getSubModules()) {
                        files.push(sm.getArtifact().getPath(), '/');
                    }
                }
            }
        }

        for(let file of files_ex) {
            if(!this._checkFile(file, files)) {
                fs.unlinkSync(file);
            }
        }

        logger.log("Build..");
        fs.ensureDirSync(this.gameDir);
        const tempNativePath = path.join(os.tmpdir(), ConfigManager.getTempNativeFolder(), crypto.pseudoRandomBytes(16).toString('hex'));

        process.throwDeprecation = true;
        
        let args = this.constructJVMArguments(tempNativePath);

        logger.log('Launch Arguments:', args);

        const child = child_process.spawn(ConfigManager.getJavaExecutable(), args, {
            cwd: this.gameDir,
            detached: true
        });

        child.unref();

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');

        const loggerMCstdout = LoggerUtil('%c[Minecraft]', 'color: #36b030; font-weight: bold');
        const loggerMCstderr = LoggerUtil('%c[Minecraft]', 'color: #b03030; font-weight: bold');

        child.stdout.on('data', (data) => {
            loggerMCstdout.log(data);
        });
        child.stderr.on('data', (data) => {
            loggerMCstderr.log(data);
        });
        child.on('close', (code, signal) => {
            logger.log('Exited with code', code);
            fs.remove(tempNativePath, (err) => {
                if(err) {
                    logger.warn('Error while deleting temp dir', err);
                } 
                else {
                    logger.log('Temp dir deleted successfully.');
                }
            });
        });
        return child;
    }

    constructJVMArguments(tempNativePath) {
        let args = [];

        args.push('-cp');
        args.push(this.classpathArg(tempNativePath).join(process.platform === 'win32' ? ';' : ':'));

        if(process.platform === 'darwin') {
            args.push('-Xdock:name=PaladiumLauncher');
            args.push('-Xdock:icon=' + path.join(__dirname, '..', 'images', 'minecraft.icns'));
        }
        
        args.push('-Xmx' + ConfigManager.getMaxRAM());
        args.push('-Xms' + ConfigManager.getMinRAM());
        args = args.concat(ConfigManager.getJVMOptions());
        args.push('-Djava.library.path=' + tempNativePath);

        args.push(this.forgeData.mainClass);
        args = args.concat(this._resolveForgeArgs());
        return args;
    }

    _resolveForgeArgs() {
        const mcArgs = this.forgeData.minecraftArguments.split(' ');
        const argDiscovery = /\${*(.*)}/;

        for(let i = 0; i < mcArgs.length; ++i) {
            if(argDiscovery.test(mcArgs[i])) {
                const identifier = mcArgs[i].match(argDiscovery)[1];
                let val = null;
                switch(identifier) {
                    case 'auth_player_name': {
                        val = this.authUser.displayName.trim();
                        break;
                    }
                    case 'version_name': {
                        val = this.instance.getMinecraftVersion();
                        break;
                    }
                    case 'game_directory': {
                        val = this.gameDir;
                        break;
                    }
                    case 'assets_root': {
                        val = path.join(this.commonDir, 'assets');
                        break;
                    }
                    case 'assets_index_name': {
                        val = this.versionData.assets;
                        break;
                    }
                    case 'auth_uuid': {
                        val = this.authUser.uuid.trim();
                        break;
                    }
                    case 'auth_access_token': {
                        val = this.authUser.accessToken;
                        break;
                    }
                    case 'user_properties': {
                        val = '{}';
                        break;
                    }
                    case 'user_type': {
                        val = 'mojang';
                        break;
                    }
                }
                if(val != null) {
                    mcArgs[i] = val;
                }
            }
        }
        return mcArgs;
    }

    classpathArg(tempNativePath) {
        let cpArgs = [];

        // Add the version.jar to the classpath.
        const version = this.versionData.id;
        cpArgs.push(path.join(this.commonDir, 'versions', version, version + '.jar'));

        // Resolve the Mojang declared libraries.
        const mojangLibs = this._resolveMojangLibraries(tempNativePath);
        cpArgs = cpArgs.concat(mojangLibs);

        // Resolve the instance declared libraries.
        const instLibs = this._resolveInstanceLibraries();
        cpArgs = cpArgs.concat(instLibs);

        const instMods = this._resolveInstanceMods();
        cpArgs = cpArgs.concat(instMods);

        return cpArgs;
    }

    _resolveMojangLibraries(tempNativePath) {
        const libs = [];
        const libArr = this.versionData.libraries;
        fs.ensureDirSync(tempNativePath);
        for(let i = 0; i < libArr.length; i++) {
            const lib = libArr[i];
            if(lib.natives == null) {
                const dlInfo = lib.downloads;
                const artifact = dlInfo.artifact;
                const to = path.join(this.libPath, artifact.path);

                if(!this._checkLibraries(artifact.path)) {
                    libs.push(to);
                }
            }
            else {
                // Extract the native library.
                const exclusionArr = lib.extract != null ? lib.extract.exclude : ['META-INF/'];
                const artifact = lib.downloads.classifiers[lib.natives[Library.mojangFriendlyOS()].replace('${arch}', process.arch.replace('x', ''))];

                // Location of native zip.
                const to = path.join(this.libPath, artifact.path);

                let zip = new AdmZip(to);
                let zipEntries = zip.getEntries();

                // Unzip the native zip.
                for(let i = 0; i < zipEntries.length; i++) {
                    const fileName = zipEntries[i].entryName;

                    let shouldExclude = false;

                    // Exclude noted files.
                    exclusionArr.forEach(function(exclusion) {
                        if(fileName.indexOf(exclusion) > -1) {
                            shouldExclude = true;
                        }
                    })

                    // Extract the file.
                    if(!shouldExclude) {
                        fs.writeFile(path.join(tempNativePath, fileName), zipEntries[i].getData(), (err) => {
                            if(err) {
                                logger.error('Error while extracting native library:', err);
                            }
                        });
                    }
                }
            }
        }
        return libs;
    }

    _checkLibraries(value) {
        const mdls = this.instance.getModules();
        for(let mdl of mdls) {
            if(mdl.getType() === DistroManager.Types.ForgeHosted) {
                if(mdl.getID().includes(value) && !mdl.hasSubModules()) {
                    return true;
                }
                else if(mdl.hasSubModules()) {
                    for(let sm of mdl.getSubModules()) {
                        if(value.includes(sm.getID())) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    _resolveInstanceLibraries() {
        const mdls = this.instance.getModules();
        let libs = [];

        // Locate Forge/Libraries
        for(let mdl of mdls) {
            const type = mdl.getType();
            if(type === DistroManager.Types.ForgeHosted || type === DistroManager.Types.Library) {
                libs.push(mdl.getArtifact().getPath());
                if(mdl.hasSubModules()) {
                    const res = this._resolveModuleLibraries(mdl);
                    if(res.length > 0) {
                        libs = libs.concat(res);
                    }
                }
            }
            else if(type === DistroManager.Types.ForgeMod && mdl.hasSubModules()) {
                const res = this._resolveModuleLibraries(mdl);
                if(res.length > 0) {
                    libs = libs.concat(res);
                }
            }
        }
        return libs;
    }

    _resolveModuleLibraries(mdl) {
        if(!mdl.hasSubModules()) {
            return [];
        }
        let libs = [];
        for(let sm of mdl.getSubModules()) {
            if(sm.getType() === DistroManager.Types.Library) {
                libs.push(sm.getArtifact().getPath());
            }
            
            if(mdl.hasSubModules()) {
                const res = this._resolveModuleLibraries(sm);
                if(res.length > 0) {
                    libs = libs.concat(res);
                }
            }
        }
        return libs;
    }

    _resolveInstanceMods() {
        const mdls = this.instance.getModules();
        let mods = [];

        for(let mdl of mdls) {
            const type = mdl.getType();
            if(type === DistroManager.Types.ForgeMod || type === DistroManager.Types.PalaMod) {
                if(mdl.hasSubModules()) {
                    const res = this._resolveModuleMods(mdl);
                    if(res.length > 0) {
                        mods = mods.concat(res);
                    }
                }
            }
        }
        return mods;
    }

    _resolveModuleMods(mdl) {
        if(!mdl.hasSubModules()) {
            return [];
        }
        let mods = [];
        for(let sm of mdl.getSubModules()) {
            if(sm.getType() === DistroManager.Types.Library) {
                mods.push(sm.getArtifact().getPath());
                if(mdl.hasSubModules()) {
                    const res = this._resolveModuleMods(sm);
                    if(res.length > 0) {
                        mods = mods.concat(res);
                    }
                }
            }
        }
        return mods;
    }
}
module.exports = ProcessBuilder;
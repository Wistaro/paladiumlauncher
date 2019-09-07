/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const AdmZip = require('adm-zip');
const async = require('async');
const child_process = require('child_process');
const crypto = require('crypto');
const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const request = require('request');
const tar = require('tar-fs');
const zlib = require('zlib');

const ConfigManager = require('./configmanager');
const DistroManager = require('./distromanager');

class Asset {
    constructor(id, hash, size, from, to) {
        this.id = id;
        this.hash = hash;
        this.size = size;
        this.from = from;
        this.to = to;
    }
}

class Library extends Asset {
    static mojangFriendlyOS() {
        const opSys = process.platform;
        if(opSys === 'darwin') {
            return 'osx';
        } 
        else if(opSys === 'win32') {
            return 'windows';
        } 
        else if(opSys === 'linux') {
            return 'linux';
        }
        else {
            return 'unknown_os';
        }
    }

    static validateRules(rules, natives) {
        if(rules == null) {
            if(natives == null) {
                return true
            } 
            else {
                return natives[Library.mojangFriendlyOS()] != null;
            }
        }
        for(let rule of rules) {
            const action = rule.action;
            const osProp = rule.os;
            if(action != null && osProp != null) {
                const osName = osProp.name;
                const osMoj = Library.mojangFriendlyOS();
                if(action === 'allow') {
                    return osName === osMoj;
                } 
                else if(action === 'disallow') {
                    return osName !== osMoj;
                }
            }
        }
        return true;
    }
}

class DistroModule extends Asset {
    constructor(id, hash, size, from, to, type) {
        super(id, hash, size, from, to);
        this.type = type;
    }
}

class DLTracker {
    constructor(dlqueue, dlsize, callback = null) {
        this.dlqueue = dlqueue;
        this.dlsize = dlsize;
        this.callback = callback;
    }
}

class JavaManager extends EventEmitter {
    static javaExecFromRoot(rootDir) {
        if(process.platform === 'win32') {
            return path.join(rootDir, 'bin', 'javaw.exe');
        } 
        else if(process.platform === 'darwin') {
            return path.join(rootDir, 'Contents', 'Home', 'bin', 'java');
        } 
        else if(process.platform === 'linux') {
            return path.join(rootDir, 'bin', 'java');
        }
        return rootDir;
    }

    static isJavaExecPath(pth) {
        if(process.platform === 'win32') {
            return pth.endsWith(path.join('bin', 'javaw.exe'));
        } 
        else if(process.platform === 'darwin') {
            return pth.endsWith(path.join('bin', 'java'));
        } 
        else if(process.platform === 'linux') {
            return pth.endsWith(path.join('bin', 'java'));
        }
        return false;
    }

    static _scanFileSystem(scanDir) {
        return new Promise((resolve, reject) => {
            fs.exists(scanDir, (e) => {
                let res = new Set();
                if(e) {
                    fs.readdir(scanDir, (err, files) => {
                        if(err) {
                            resolve(res);
                            console.log(err);
                        } 
                        else {
                            let pathsDone = 0;
                            for(let i = 0; i < files.length; i++) {
                                const combinedPath = path.join(scanDir, files[i]);
                                const execPath = JavaManager.javaExecFromRoot(combinedPath);

                                fs.exists(execPath, (v) => {
                                    if(v) {
                                        res.add(combinedPath);
                                    }

                                    ++pathsDone;

                                    if(pathsDone === files.length) {
                                        resolve(res);
                                    }
                                });
                            }
                            if(pathsDone === files.length) {
                                resolve(res);
                            }
                        }
                    });
                } 
                else {
                    resolve(res);
                }
            });
        });
    }

    static parseJavaRuntimeVersion(verString) {
        const major = verString.split('.')[0];
        if(major == 1) {
            return JavaManager._parseJavaRuntimeVersion_8(verString);
        }
    }

    static _parseJavaRuntimeVersion_8(verString) {
        // 1.{major}.0_{update}-b{build}
        // ex. 1.8.0_152-b16
        const ret = {};
        let pts = verString.split('-');
        ret.build = parseInt(pts[1].substring(1));
        pts = pts[0].split('_');
        ret.update = parseInt(pts[1]);
        ret.major = parseInt(pts[0].split('.')[1]);
        return ret;
    }

    static _sortValidJavaArray(validArr) {
        const retArr = validArr.sort((a, b) => {
            if(a.version.major === b.version.major) {
                if(a.version.major < 9) {
                    // Java 8
                    if(a.version.update === b.version.update){
                        if(a.version.build === b.version.build){
                            // Same version, give priority to JRE.
                            if(a.execPath.toLowerCase().indexOf('jdk') > -1){
                                return b.execPath.toLowerCase().indexOf('jdk') > -1 ? 0 : 1
                            } 
                            else {
                                return -1
                            }
                        } 
                        else {
                            return a.version.build > b.version.build ? -1 : 1
                        }
                    } 
                    else {
                        return  a.version.update > b.version.update ? -1 : 1
                    }
                }
            }
            else {
                return a.version.major > b.version.major ? -1 : 1
            }
        });
        return retArr
    }
}

class AssetManager extends EventEmitter {
    constructor(commonPath, javaexec) {
        super();
        this.totaldlsize = 0;
        this.progress = 0;

        this.assets = new DLTracker([], 0);
        this.libraries = new DLTracker([], 0);
        this.files = new DLTracker([], 0);
        this.forge = new DLTracker([], 0);
        this.java = new DLTracker([], 0);

        this.extractQueue = [];
        this.commonPath = commonPath;
        this.javaexec = javaexec;
    }

    static _calculateHash(buf, algo) {
        return crypto.createHash(algo).update(buf).digest('hex');
    }

    static _validateLocal(filePath, algo, hash) {
        if(fs.existsSync(filePath)) {
            // No hash provided, have to assume it's good.
            if(hash == null) {
                return true;
            }
            let buf = fs.readFileSync(filePath);
            let calcdhash = AssetManager._calculateHash(buf, algo);
            return calcdhash === hash;
        }
        return false
    }

    validateDistribution(instance) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.forge = self._parseDistroModules(instance.getModules(), instance.getMinecraftVersion(), instance.getID());
            resolve(instance);
        });
    }

    _parseDistroModules(modules, version, instanceid) {
        let alist = [];
        let asize = 0;
        for(let ob of modules) {
            let obArtifact = ob.getArtifact();
            let obPath = obArtifact.getPath();
            let artifact = new DistroModule(ob.getIdentifier(), obArtifact.getHash(), obArtifact.getSize(), obArtifact.getURL(), obPath, ob.getType());
            const validationPath = obPath.toLowerCase().endsWith('.pack.xz') ? obPath.substring(0, obPath.toLowerCase().lastIndexOf('.pack.xz')) : obPath;
            if(!AssetManager._validateLocal(validationPath, 'MD5', artifact.hash)) {
                asize += artifact.size * 1;
                alist.push(artifact);
                if(validationPath !== obPath) {
                    this.extractQueue.push(obPath);
                }
            }
            // Recursively process the submodules then combine the results.
            if(ob.getSubModules() != null) {
                let dltrack = this._parseDistroModules(ob.getSubModules(), version, instanceid);
                asize += dltrack.dlsize*1;
                alist = alist.concat(dltrack.dlqueue);
            }
        }
        return new DLTracker(alist, asize);
    }

    loadVersionData(version, force = false) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            const versionPath = path.join(self.commonPath, 'versions', version);
            const versionFile = path.join(versionPath, version + '.json');
            if(!fs.existsSync(versionFile) || force) {
                const url = await self._getVersionDataUrl(version);
                //This download will never be tracked as it's essential and trivial.
                console.log('Preparing download of ' + version + ' assets.');
                fs.ensureDirSync(versionPath);
                const stream = request(url).pipe(fs.createWriteStream(versionFile));
                stream.on('finish', () => {
                    resolve(JSON.parse(fs.readFileSync(versionFile)));
                });
            } 
            else {
                resolve(JSON.parse(fs.readFileSync(versionFile)));
            }
        });
    }

    _getVersionDataUrl(version) {
        return new Promise((resolve, reject) => {
            request('https://launchermeta.mojang.com/mc/game/version_manifest.json', (error, resp, body) => {
                if(error) {
                    reject(error);
                } 
                else {
                    const manifest = JSON.parse(body);
                    for(let v of manifest.versions) {
                        if(v.id === version) {
                            resolve(v.url);
                        }
                    }
                    resolve(null);
                }
            });
        });
    }

    validateAssets(versionData, force = false) {
        const self = this;
        return new Promise((resolve, reject) => {
            self._assetChainIndexData(versionData, force).then(() => {
                resolve();
            });
        });
    }

    _assetChainIndexData(versionData, force = false) {
        const self = this;
        return new Promise((resolve, reject) => {
            //Asset index constants.
            const assetIndex = versionData.assetIndex;
            const name = assetIndex.id + '.json';
            const indexPath = path.join(self.commonPath, 'assets', 'indexes');
            const assetIndexLoc = path.join(indexPath, name);

            let data = null;
            if(!fs.existsSync(assetIndexLoc) || force) {
                console.log('Downloading ' + versionData.id + ' asset index.');
                fs.ensureDirSync(indexPath);
                const stream = request(assetIndex.url).pipe(fs.createWriteStream(assetIndexLoc));
                stream.on('finish', () => {
                    data = JSON.parse(fs.readFileSync(assetIndexLoc, 'utf-8'));
                    self._assetChainValidateAssets(versionData, data).then(() => {
                        resolve();
                    });
                });
            } 
            else {
                data = JSON.parse(fs.readFileSync(assetIndexLoc, 'utf-8'));
                self._assetChainValidateAssets(versionData, data).then(() => {
                    resolve()
                });
            }
        });
    }

    _assetChainValidateAssets(versionData, indexData) {
        const self = this;
        return new Promise((resolve, reject) => {
            //Asset constants
            const resourceURL = 'http://resources.download.minecraft.net/';
            const localPath = path.join(self.commonPath, 'assets');
            const objectPath = path.join(localPath, 'objects');

            const assetDlQueue = [];
            let dlSize = 0;
            let acc = 0;
            const total = Object.keys(indexData.objects).length;
            //const objKeys = Object.keys(data.objects)
            async.forEachOfLimit(indexData.objects, 10, (value, key, cb) => {
                acc++;
                self.emit('progress', 'assets', acc, total);
                const hash = value.hash;
                const assetName = path.join(hash.substring(0, 2), hash);
                const urlName = hash.substring(0, 2) + '/' + hash;
                const ast = new Asset(key, hash, value.size, resourceURL + urlName, path.join(objectPath, assetName));
                if(!AssetManager._validateLocal(ast.to, 'sha1', ast.hash)) {
                    dlSize += (ast.size*1);
                    assetDlQueue.push(ast);
                }
                cb();
            }, (err) => {
                self.assets = new DLTracker(assetDlQueue, dlSize);
                resolve();
            });
        });
    }

    validateLibraries(versionData) {
        const self = this;
        return new Promise((resolve, reject) => {
            const libArr = versionData.libraries;
            const libPath = path.join(self.commonPath, 'libraries');

            const libDlQueue = [];
            let dlSize = 0;

            //Check validity of each library. If the hashs don't match, download the library.
            async.eachLimit(libArr, 5, (lib, cb) => {
                if(Library.validateRules(lib.rules, lib.natives)) {
                    let artifact = (lib.natives == null) ? lib.downloads.artifact : lib.downloads.classifiers[lib.natives[Library.mojangFriendlyOS()].replace('${arch}', process.arch.replace('x', ''))];
                    const libItm = new Library(lib.name, artifact.sha1, artifact.size, artifact.url, path.join(libPath, artifact.path));
                    if(!AssetManager._validateLocal(libItm.to, 'sha1', libItm.hash)) {
                        dlSize += (libItm.size*1);
                        libDlQueue.push(libItm);
                    }
                }
                cb();
            }, (err) => {
                self.libraries = new DLTracker(libDlQueue, dlSize);
                resolve();
            });
        });
    }

    validateMiscellaneous(versionData) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            await self.validateClient(versionData);
            await self.validateLogConfig(versionData);
            resolve();
        });
    }

    validateClient(versionData, force = false){
        const self = this;
        return new Promise((resolve, reject) => {
            const clientData = versionData.downloads.client;
            const version = versionData.id;
            const targetPath = path.join(self.commonPath, 'versions', version);
            const targetFile = version + '.jar';

            let client = new Asset(version + ' client', clientData.sha1, clientData.size, clientData.url, path.join(targetPath, targetFile));

            if(!AssetManager._validateLocal(client.to, 'sha1', client.hash) || force) {
                self.files.dlqueue.push(client);
                self.files.dlsize += client.size*1;
                resolve();
            } 
            else {
                resolve();
            }
        });
    }

    validateLogConfig(versionData) {
        const self = this;
        return new Promise((resolve, reject) => {
            const client = versionData.logging.client;
            const file = client.file;
            const targetPath = path.join(self.commonPath, 'assets', 'log_configs');

            let logConfig = new Asset(file.id, file.sha1, file.size, file.url, path.join(targetPath, file.id));

            if(!AssetManager._validateLocal(logConfig.to, 'sha1', logConfig.hash)) {
                self.files.dlqueue.push(logConfig);
                self.files.dlsize += logConfig.size*1;
                resolve();
            } 
            else {
                resolve();
            }
        });
    }

    async processDlQueues(identifiers = [{id:'assets', limit:1}, {id:'libraries', limit:1}, {id:'files', limit:1}, {id:'forge', limit:1}]) {
        return new Promise((resolve, reject) => {
            let shouldFire = true;

            // Assign dltracking variables.
            this.totaldlsize = 0;
            this.progress = 0;

            for(let iden of identifiers) {
                this.totaldlsize += this[iden.id].dlsize;
            }

            this.once('complete', (data) => {
                resolve();
            });

            for(let iden of identifiers) {
                let r = this.startAsyncProcess(iden.id, iden.limit);
                if(r) {
                    shouldFire = false;
                }
            }

            if(shouldFire) {
                this.emit('complete', 'download');
            }
        });
    }

    startAsyncProcess(identifier, limit = 1) {
        const self = this;
        const dlTracker = this[identifier];
        const dlQueue = dlTracker.dlqueue;

        if(dlQueue.length > 0) {
            async.eachLimit(dlQueue, limit, (asset, cb) => {
                //console.log(`Download assets : ${asset.id}: ${asset.size}`);
                fs.ensureDirSync(path.join(asset.to, '..'));

                let req = request(asset.from);
                req.pause();

                req.on('response', (resp) => {
                    if(resp.statusCode === 200) {
                        let doHashCheck = false;
                        const contentLength = parseInt(resp.headers['content-length']);
                        
                        if(contentLength !== asset.size) {
                            console.log(`WARN: Got ${contentLength} bytes for ${asset.id}: Expected ${asset.size}`);
                            doHashCheck = true;

                            // Adjust download
                            this.totaldlsize -= asset.size;
                            this.totaldlsize += contentLength;
                        }

                        let writeStream = fs.createWriteStream(asset.to);
                        writeStream.on('close', () => {
                            if(dlTracker.callback != null) {
                                dlTracker.callback.apply(dlTracker, [asset, self]);
                            }

                            if(doHashCheck) {
                                const v = AssetManager._validateLocal(asset.to, asset.type != null ? 'md5' : 'sha1', asset.hash);
                                if(v) {
                                    console.log(`Hashes match for ${asset.id}, byte mismatch is an issue in the distro index.`);
                                } 
                                else {
                                    console.error(`Hashes do not match, ${asset.id} may be corrupted.`);
                                }
                            }
                            cb()
                        });
                        req.pipe(writeStream);
                        req.resume();

                    } 
                    else {
                        req.abort();
                        console.log(`Failed to download ${asset.id}(${typeof asset.from === 'object' ? asset.from.url : asset.from}). Response code ${resp.statusCode}`);
                        self.progress += asset.size*1;
                        self.emit('progress', 'download', self.progress, self.totaldlsize);
                        cb();
                    }
                });

                req.on('error', (err) => {
                    self.emit('error', 'download', err);
                });

                req.on('data', (chunk) => {
                    self.progress += chunk.length;
                    self.emit('progress', 'download', self.progress, self.totaldlsize);
                });
            }, (err) => {
                if(err) {
                    console.log('An item in ' + identifier + ' failed to process');
                } 
                else {
                    console.log('All ' + identifier + ' have been processed successfully');
                }

                //self.totaldlsize -= dlTracker.dlsize
                //self.progress -= dlTracker.dlsize
                self[identifier] = new DLTracker([], 0);

                if(self.progress >= self.totaldlsize) {
                    self.emit('complete', 'download');
                }
            });
            return true;
        } 
        else {
            return false;
        }
    }

    loadForgeData(server) {
        const self = this;
        return new Promise(async (resolve, reject) => {
            const modules = server.getModules();
            for(let ob of modules) {
                const type = ob.getType();
                if(type === DistroManager.Types.ForgeHosted || type === DistroManager.Types.Forge) {
                    let obArtifact = ob.getArtifact();
                    let obPath = obArtifact.getPath();
                    let asset = new DistroModule(ob.getIdentifier(), obArtifact.getHash(), obArtifact.getSize(), obArtifact.getURL(), obPath, type);
                    try {
                        let forgeData = await AssetManager._finalizeForgeAsset(asset, self.commonPath);
                        resolve(forgeData);
                    } 
                    catch (err) {
                        reject(err);
                    }
                    return;
                }
            }
            reject('No forge module found!');
        });
    }

    static _finalizeForgeAsset(asset, commonPath) {
        return new Promise((resolve, reject) => {
            fs.readFile(asset.to, (err, data) => {
                const zip = new AdmZip(data);
                const zipEntries = zip.getEntries();

                for(let i = 0; i < zipEntries.length; i++) {
                    if(zipEntries[i].entryName === 'version.json') {
                        const forgeVersion = JSON.parse(zip.readAsText(zipEntries[i]));
                        const versionPath = path.join(commonPath, 'versions', forgeVersion.id);
                        const versionFile = path.join(versionPath, forgeVersion.id + '.json');
                        if(!fs.existsSync(versionFile)) {
                            fs.ensureDirSync(versionPath);
                            fs.writeFileSync(path.join(versionPath, forgeVersion.id + '.json'), zipEntries[i].getData());
                            resolve(forgeVersion);
                        } 
                        else {
                            //Read the saved file to allow for user modifications.
                            resolve(JSON.parse(fs.readFileSync(versionFile, 'utf-8')));
                        }
                        return;
                    }
                }
                //We didn't find forge's version.json.
                reject('Unable to finalize Forge processing, version.json not found! Has forge changed their format?');
            })
        })
    }

    async validateEverything(instanceid) {
        try {
            if(!ConfigManager.isLoaded()){
                ConfigManager.load()
            }

            const distro = await DistroManager.pullRemote(ConfigManager.getDistroURL());
            const instance = distro.getInstance(instanceid);

            await this.validateDistribution(instance);
            this.emit('validate', 'distribution');

            const versionData = await this.loadVersionData(instance.getMinecraftVersion());
            this.emit('validate', 'version');

            await this.validateAssets(versionData);
            this.emit('validate', 'assets');
            
            await this.validateLibraries(versionData);
            this.emit('validate', 'libraries');

            await this.validateMiscellaneous(versionData);
            this.emit('validate', 'files');

            await this.processDlQueues();
            const forgeData = await this.loadForgeData(instance);

            return {
                versionData,
                forgeData
            }
        }
        catch (err) {
            console.log("err: ", err);
            return {
                error: err
            }
        }
    }

    validateLocalJavaDownload(javaData) {
        const self = this;
        return new Promise((resolve, reject) => {
            const targetPath = path.join(ConfigManager.getWorkingDirectory(), 'runtime', 'x64');
            const targetFile = 'runtime.tar.gz';

            let jre = new Asset('java', javaData.MD5, javaData.size, javaData.url, path.join(targetPath, targetFile));

            this.java = new DLTracker([jre], jre.size, (a, self) => {
                let h = null
                fs.createReadStream(a.to)
                    .on('error', err => console.log(err))
                    .pipe(zlib.createGunzip())
                    .on('error', err => console.log(err))
                    .pipe(tar.extract(targetPath, {
                        map: (header) => {
                            if(h == null) {
                                h = header.name;
                            }
                        }
                    }))
                    .on('error', err => console.log(err))
                    .on('finish', () => {
                        fs.unlink(a.to, err => {
                            if(err) {
                                console.log(err);
                            }
                            if(h.indexOf('/') > -1) {
                                h = h.substring(0, h.indexOf('/'));
                            }

                            const pos = path.join(targetPath, h);
                            self.emit('complete', 'java', JavaManager.javaExecFromRoot(pos));
                        });
                    });
            });
            resolve();
        });
    }

    _validateJVMProperties(stderr) {
        const res = stderr;
        const props = res.split('\n');

        const goal = 2;
        let checksum = 0;

        const meta = {};

        for(let i = 0; i < props.length; i++) {
            if(props[i].indexOf('sun.arch.data.model') > -1) {
                let arch = props[i].split('=')[1].trim();
                arch = parseInt(arch);
                if(arch === 64) {
                    meta.arch = arch;
                    ++checksum;
                    if(checksum === goal) {
                        break;
                    }
                }
            } 
            else if(props[i].indexOf('java.runtime.version') > -1) {
                let verString = props[i].split('=')[1].trim();
                const verOb = JavaManager.parseJavaRuntimeVersion(verString);
                if(verOb.major < 9) {
                    // Java 8
                    if(verOb.major === 8 && verOb.update >= 51) {
                        meta.version = verOb;
                        ++checksum;
                        if(checksum === goal) {
                            break;
                        }
                    }
                }
            }
        }
        meta.valid = checksum === goal;
        return meta;
    }

    _validateJavaBinary(binaryExecPath) {
        return new Promise((resolve, reject) => {
            if(!JavaManager.isJavaExecPath(binaryExecPath)) {
                resolve({valid: false});
            } 
            else if(fs.existsSync(binaryExecPath)) {
                child_process.exec('"' + binaryExecPath + '" -XshowSettings:properties', (err, stdout, stderr) => {
                    try {
                        // Output is stored in stderr?
                        resolve(this._validateJVMProperties(stderr));
                    } 
                    catch (err) {
                        // Output format might have changed, validation cannot be completed.
                        resolve({valid: false});
                    }
                })
            } 
            else {
                resolve({valid: false});
            }
        });
    }

    async _validateJavaRootSet(rootSet) {
        const rootArr = Array.from(rootSet);
        const validArr = []

        for(let i = 0; i < rootArr.length; i++) {
            const execPath = JavaManager.javaExecFromRoot(rootArr[i]);
            const metaOb = await this._validateJavaBinary(execPath);
            if(metaOb.valid) {
                metaOb.execPath = execPath;
                validArr.push(metaOb);
            }
        }
        return validArr;
    }

    async _win32JavaValidate(workingDir) {
        const pathSet = await JavaManager._scanFileSystem(path.join(workingDir, 'runtime', 'x64'));
        let pathArr = await this._validateJavaRootSet(pathSet);

        if(pathArr.length > 0) {
            return pathArr[0].execPath;
        } 
        else {
            return null;
        }
    }

    async _darwinJavaValidate(workingDir) {
        // Soon update (After Beta windows)
    }

    async _linuxJavaValidate(workingDir) {
        // Soon update (After Beta windows)
    }

    async validateLocalJava(workingDir) {
        return await this['_' + process.platform + 'JavaValidate'](workingDir);
    }

    async validateJava(workingDir) {
        if(!ConfigManager.isLoaded()){
            ConfigManager.load()
        }

        try {
            const distro = await DistroManager.pullRemote(ConfigManager.getDistroURL());
            const javaData = distro.getJava()[Library.mojangFriendlyOS()];

            const javaPath = await this.validateLocalJava(ConfigManager.getWorkingDirectory());
            
            if(javaPath == null) {
                await this.validateLocalJavaDownload(javaData);
            }
            return javaPath;
        }
        catch (err) {
            console.log("err: ", err);
            return {
                error: err
            }
        }
    }
}

module.exports = {
    JavaManager,
    AssetManager,
    Asset,
    Library
}
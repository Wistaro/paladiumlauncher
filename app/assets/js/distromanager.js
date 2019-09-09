/**
 * Paladium Launcher - https://github.com/Chaika9/paladiumlauncher
 * Copyright (C) 2019 Paladium
 */

const path = require('path');
const request = require('request');

const ConfigManager = require('./configmanager');

class Artifact {
    static fromJSON(json) {
        return Object.assign(new Artifact(), json);
    }

    getHash() {
        return this.MD5;
    }

    getSize() {
        return this.size;
    }

    getURL() {
        return this.url;
    }

    getPath() {
        return this.path;
    }
}
exports.Artifact;

class Required {
    static fromJSON(json) {
        if(json == null) {
            return new Required(true, true);
        } 
        else {
            return new Required(json.value == null ? true : json.value, json.def == null ? true : json.def);
        }
    }

    constructor(value, def) {
        this.value = value;
        this.default = def;
    }

    isDefault() {
        return this.default;
    }

    isRequired() {
        return this.value;
    }
}
exports.Required;

class Module {
    static fromJSON(json, instanceid) {
        return new Module(json.id, json.name, json.type, json.required, json.artifact, json.subModules, instanceid);
    }

    static _resolveDefaultExtension(type){
        switch (type) {
            case exports.Types.Library:
            case exports.Types.ForgeHosted:
            case exports.Types.ForgeMod:
                return 'jar';
            case exports.Types.PalaMod:
                return 'pala'; // Forge custom
            case exports.Types.File:
            default:
                return 'jar';
        }
    }

    constructor(id, name, type, required, artifact, subModules, instanceid) {
        this.identifier = id
        this.type = type
        this._resolveMetaData()
        this.name = name
        this.required = Required.fromJSON(required)
        this.artifact = Artifact.fromJSON(artifact)
        this._resolveArtifactPath(artifact.path, instanceid)
        this._resolveSubModules(subModules, instanceid)
    }

    _resolveMetaData() {
        try {
            const m0 = this.identifier.split('@');

            this.artifactExt = m0[1] || Module._resolveDefaultExtension(this.type);

            const m1 = m0[0].split(':');

            this.artifactClassifier = m1[3] || undefined;
            this.artifactVersion = m1[2] || '???';
            this.artifactID = m1[1] || '???';
            this.artifactGroup = m1[0] || '???';
        } 
        catch (err) {
            logger.error('Improper ID for module', this.identifier, err);
        }
    }

    _resolveArtifactPath(artifactPath, instanceid) {
        const pth = artifactPath == null ? path.join(...this.getGroup().split('.'), this.getID(), this.getVersion(), `${this.getID()}-${this.getVersion()}${this.artifactClassifier != undefined ? `-${this.artifactClassifier}` : ''}.${this.getExtension()}`) : artifactPath;
        const modpth = artifactPath == null ? path.join(`${this.getID()}-${this.getVersion()}${this.artifactClassifier != undefined ? `-${this.artifactClassifier}` : ''}.${this.getExtension()}`) : artifactPath;

        switch (this.type) {
            case exports.Types.Library:
            case exports.Types.ForgeHosted:
                this.artifact.path = path.join(ConfigManager.getCommonDirectory(), 'libraries', pth);
                break;
            case exports.Types.ForgeMod:
                this.artifact.path = path.join(ConfigManager.getInstanceDirectory(), instanceid, 'mods', modpth);
                break;
            case exports.Types.PalaMod:
                this.artifact.path = path.join(ConfigManager.getInstanceDirectory(), instanceid, 'mods', modpth); // Forge custom
                break;
            case exports.Types.VersionManifest:
                this.artifact.path = path.join(ConfigManager.getCommonDirectory(), 'versions', this.getIdentifier(), `${this.getIdentifier()}.json`)
                break;
            case exports.Types.File:
            default:
                this.artifact.path = path.join(ConfigManager.getInstanceDirectory(), instanceid, pth)
                break;
        }
    }

    _resolveSubModules(json, instanceid) {
        const arr = [];
        if(json != null) {
            for(let sm of json) {
                arr.push(Module.fromJSON(sm, instanceid));
            }
        }
        this.subModules = arr.length > 0 ? arr : null;
    }

    getIdentifier() {
        return this.identifier;
    }

    getName() {
        return this.name;
    }

    getRequired() {
        return this.required;
    }

    getArtifact() {
        return this.artifact;
    }

    getID() {
        return this.artifactID;
    }

    getGroup() {
        return this.artifactGroup;
    }

    getVersionlessID() {
        return this.getGroup() + ':' + this.getID();
    }

    getExtensionlessID() {
        return this.getIdentifier().split('@')[0];
    }

    getVersion() {
        return this.artifactVersion;
    }

    getClassifier() {
        return this.artifactClassifier;
    }

    getExtension() {
        return this.artifactExt;
    }

    hasSubModules() {
        return this.subModules != null;
    }

    getSubModules() {
        return this.subModules;
    }

    getType() {
        return this.type;
    }
}
exports.Module;

class Instance {
    static fromJSON(json) {
        const mdls = json.modules;
        json.modules = [];

        const inst = Object.assign(new Instance(), json);
        inst._resolveModules(mdls);
        return inst;
    }

    _resolveModules(json) {
        const arr = [];
        for(let m of json) {
            arr.push(Module.fromJSON(m, this.getID()));
        }
        this.modules = arr;
    }

    getID() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getDescription() {
        return this.description;
    }

    getVersion() {
        return this.version;
    }

    getMinecraftVersion() {
        return this.minecraftVersion;
    }

    isMainServer() {
        return this.mainServer;
    }

    getModules() {
        return this.modules;
    }

    getIgnored() {
        return this.ignored;
    }
}
exports.Instance;

class DistroIndex {
    static fromJSON(json) {
        const instances = json.instances;
        json.instances = [];

        const distro = Object.assign(new DistroIndex(), json);
        distro._resolveInstances(instances);
        distro._resolveMainInstance();
        return distro;
    }

    _resolveInstances(json) {
        const arr = [];
        for(let s of json) {
            arr.push(Instance.fromJSON(s));
        }
        this.instances = arr;
    }

    _resolveMainInstance(){
        for(let inst of this.instances) {
            if(inst.mainInstance) {
                this.mainInstance = inst.id;
                return;
            }
        }
        this.mainInstance = (this.instances.length > 0) ? this.instances[0].getID() : null;
    }

    getMaintenance() {
        return this.maintenance;
    }

    getVersionMinimum() {
        return this.versionMinimum;
    }

    getJava() {
        return this.java;
    }

    getInstances() {
        return this.instances;
    }

    getInstance(id) {
        for(let inst of this.instances) {
            if(inst.id === id) {
                return inst;
            }
        }
        return null;
    }

    getMainInstance() {
        return this.mainInstance != null ? this.getInstance(this.mainInstance) : null
    }
}
exports.DistroIndex;

exports.Types = {
    Library: 'Library',
    ForgeHosted: 'ForgeHosted',
    Forge: 'Forge',
    ForgeMod: 'ForgeMod',
    PalaMod: 'PalaMod',
    File: 'File',
    VersionManifest: 'VersionManifest'
}

let data = null;

exports.pullRemote = async function(distroURL) {
    return new Promise((resolve, reject) => {
        let opts = {
            url: distroURL,
            timeout: 10000
        }
        request(opts, (error, resp, body) => {
            if(!error) {
                try {
                    data = DistroIndex.fromJSON(JSON.parse(body));
                    resolve(data);
                } 
                catch (e) {
                    reject(e);
                }
            }
            else {
                reject(error);
            }
        });
    });
}

exports.getDistribution = function() {
    return data;
}
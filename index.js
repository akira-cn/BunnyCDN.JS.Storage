import { dirname } from 'path';
import { generateChecksum } from './utils.js';
import fetch from 'node-fetch';
import mime from 'mime';

export default class BunnyCDNStorage {
  #storageZoneName;
  #apiAccessKey;
  #storageZoneRegion;
  #cdnHost;

  constructor({
    storageZoneName,
    apiAccessKey,
    storageZoneRegion,
    cdnHost,
  }) {
    this.#storageZoneName = storageZoneName;
    this.#apiAccessKey = apiAccessKey;
    this.#storageZoneRegion = storageZoneRegion;
    this.#cdnHost = cdnHost;
  }

  getApiUrl(filepath) {
    const region = this.#storageZoneRegion;
    const storageZoneName = this.#storageZoneName;

    return `https://${region}.storage.bunnycdn.com/${storageZoneName}/${filepath}`;
  }

  async upload(fileDataOrUrl, filepath) {
    let body = fileDataOrUrl;
    if(fileDataOrUrl.url) {
      body = Buffer.from(await (await fetch(fileDataOrUrl.url)).arrayBuffer());
    }
    const checksum = generateChecksum(body);
    const accessKey = this.#apiAccessKey;
    const options = {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        AccessKey: accessKey,
        Checksum: checksum,
      },
      body,
    };
    const api = this.getApiUrl(filepath);
    const data = await (await fetch(api, options)).json();
    const cdnHost = this.#cdnHost;
    if(data.HttpCode === 201) {
      data.file = filepath;
      if(cdnHost) data.cdnUrl = `${cdnHost}/${filepath}`;
    }
    return data;
  }

  async download(filepath) {
    const accessKey = this.#apiAccessKey;
    const options = {
      method: 'GET',
      headers: {
        accept: '*/*',
        AccessKey: accessKey
      }
    };

    const api = this.getApiUrl(filepath);
    const res = await fetch(api, options);

    const type = mime.getType(filepath);
    let body;

    if(/^text(\/|$)/.test(type)) {
      body = await res.text();
    } else if(type === 'application/json') {
      body = await res.json();
    } else {
      body = Buffer.from(await res.arrayBuffer());
    }

    return {type, body};
  }

  async delete(filepath) {
    const accessKey = this.#apiAccessKey;
    const options = {
      method: 'DELETE',
      headers: {
        AccessKey: accessKey
      }
    };

    const api = this.getApiUrl(filepath);
    const res = await fetch(api, options);

    return await res.json();
  }

  async list(dirpath = '/') {
    const accessKey = this.#apiAccessKey;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        AccessKey: accessKey
      }
    };

    if(!dirpath.endsWith('/')) dirpath += '/';

    const api = this.getApiUrl(dirpath);
    const res = await fetch(api, options);

    return await res.json();
  }
}
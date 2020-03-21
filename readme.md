# hafas-generate-gtfs

**Generate [GTFS](https://gtfs.org/reference/static) dumps from HAFAS endpoints.**

[![npm version](https://img.shields.io/npm/v/hafas-generate-gtfs.svg)](https://www.npmjs.com/package/hafas-generate-gtfs)
[![build status](https://api.travis-ci.org/derhuerst/hafas-generate-gtfs.svg?branch=master)](https://travis-ci.org/derhuerst/hafas-generate-gtfs)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/hafas-generate-gtfs.svg)
![minimum Node.js version](https://img.shields.io/node/v/hafas-generate-gtfs.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me on Patreon](https://img.shields.io/badge/support%20me-on%20patreon-fa7664.svg)](https://patreon.com/derhuerst)

Given a [`hafas-client@5`](https://github.com/public-transport/hafas-client/tree/5)-compatible HAFAS client, a time frame, and a bounding box or [`GeoJSON`](https://geojson.org) shape, `hafas-generate-gtfs` tries to build a GTFS feed for the area:

1. Finds all stations in the area.
2. Fetches all departures at these stations within the time frame.
3. Fetches the trip for each departure.


## Installation

```shell
npm install hafas-generate-gtfs
```


## Usage

```js
todo
```


## Contributing

If you have a question or need support using `hafas-generate-gtfs`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/hafas-generate-gtfs/issues).

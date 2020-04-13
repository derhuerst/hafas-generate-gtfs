'use strict'

const createHafasClient = require('hafas-client')
const withThrottling = require('hafas-client/throttle')
const bvgProfile = require('hafas-client/p/bvg')
const {createClient: createRedis} = require('redis')
const createRedisStore = require('cached-hafas-client/stores/redis')
const withCache = require('cached-hafas-client')
const generateGtfs = require('.')

const centerOfBerlin = {
	type: 'Polygon',
	coordinates: [[
		[13.350, 52.528],
		[13.350, 52.516],
		[13.358, 52.504],
		[13.389, 52.493],
		[13.436, 52.495],
		[13.449, 52.513],
		[13.439, 52.530],
		[13.413, 52.537],
		[13.378, 52.538],
		[13.350, 52.528]
	]]
}

// todo: with retrying
const bvgHafas = createHafasClient(
	withThrottling(bvgProfile, 5, 1000), // 5/s
	'hafas-generate-gtfs:example',
)

const createWritable = (filename) => {
	const write = (row, _, cb) => {
		console.log(filename, row)
		cb(null)
	}
	return new Writable({objectMode: true, write})
}

;(async () => {
	const store = createRedisStore(createRedis())
	const hafas = await withCache(bvgHafas, store, 60 * 60 * 1000)

	await generateGtfs(hafas, createWritable, centerOfBerlin, {
		begin: new Date('2020-06-01T03:00+02:00'),
		duration: 2 * 60 * 60 * 1000,
	})
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})

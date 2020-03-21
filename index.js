'use strict'

const {ok} = require('assert')
const findStations = require('hafas-find-stations')
const debug = require('debug')('hafas-generate-gtfs')
const createCollectDeps = require('hafas-collect-departures-at')
const findDepsDurationLimit = require('./lib/find-departures-duration-limit')

const DAY = 24 * 60 * 60 * 1000

const isValidDep = (dep) => {
	const when = +new Date(dep.plannedWhen)
	if (Number.isNaN(when)) {
		debug('invalid departure', dep)
		return false
	}
	return true
}

// todo: progress estimation
const generateGtfs = async (hafas, createWritable, serviceArea, opt = {}) => {
	let {
		begin, duration,
		// todo: products filter?
	} = {
		begin: Date.now(),
		duration: 30 * DAY,
		...opt
	}
	begin = +new Date(begin)
	ok(!Number.isNaN(begin), 'begin is invalid')
	ok(Number.isInteger(duration), 'duration is invalid')
	ok(duration > 0, 'duration is invalid')

	// todo: optionally use hafas-discover-stations?
	const stations = await findStations(hafas, serviceArea)

	const durStep = await findDepsDurationLimit(hafas, stations[0])
	debug('duration step', durStep)

	const onDep = (dep, station) => {
		// todo
		console.log(JSON.stringify([dep, station]))
	}

	const end = begin + duration
	const collectDeps = createCollectDeps(hafas.departures, {}, durStep)
	for (const station of stations) {
		debug('fetching departures', station.id, station.name)
		for await (let deps of collectDeps(station.id, begin)) {
			deps = deps
			.filter(isValidDep)
			.sort((a, b) => new Date(a.plannedWhen) - new Date(b.plannedWhen))
			deps.forEach(dep => onDep(dep, station))

			const lastWhen = +new Date(deps[deps.length - 1].plannedWhen)
			if (deps.length === 0) {
				debug('0 departures', deps) // todo: log `when`
				break
			} else if (lastWhen >= end) break
			else debug('progress', ((lastWhen - begin) / duration).toFixed(3))
		}
	}
	// todo
}

module.exports = generateGtfs

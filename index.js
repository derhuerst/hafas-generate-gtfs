'use strict'

const {ok} = require('assert')
const findStations = require('hafas-find-stations')
const debug = require('debug')('hafas-generate-gtfs')
const Queue = require('queue')
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
	if ('function' !== typeof hafas.trip) {
		throw new Error('invalid HAFAS client: .trip is not a function')
	}

	let {
		begin, duration, concurrency,
		// todo: products filter?
	} = {
		begin: Date.now(),
		duration: 30 * DAY,
		concurrency: 4,
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

	const queue = new Queue({
		concurrency,
		// todo: timeout
	})

	// todo: fare_rules, fare_attributes
	// todo: shapes
	// todo: frequencies
	// todo: pathways
	// todo: levels
	// todo: feed_info
	// todo: translations
	// todo: attributions

	const agencies = new Map()
	const stops = new Map()
	const routes = new Map()
	const trips = []
	const stop_times = []

	const addAgency = (dep) => {
		const a = {
			agency_id: String(agencies.size+1),
			agency_name: dep.line.operator.name
		}
		agencies.set(String(agencies.size+1), a)
	}

	const formatStop = (stop) => {
		const f = {
			stop_id: stop.id,
			stop_name: stop.name, // todo: normalize
			stop_lat: stop.location.latitude,
			stop_lon: stop.location.longitude,
			location_type: 0, parent_station: null,
		}
		if (stop.station) {
			f.location_type = 1
			f.parent_station = stop.station.id
		}
		return f
	}
	const addStop = (stop) => {
		if (!stops.has(stop.id)) {
			stops.set(stop.id, formatStop(stop))
		}
		if (stop.station && !stops.has(stop.station.id)) {
			stops.set(stop.station.id, formatStop(stop.station))
		}
	}

	const routeTypeByProduct = Object.assign(Object.create(null), {
		suburban: 0,
		subway: 1,
		tram: 0,
		bus: 3,
		ferry: 4,
		express: 2,
		regional: 2,
	})
	const addLine = (line) => {
		if (routes.has(line.id)) return;
		routes.set(line.id, {
			route_id: line.id,
			// leave this temporary blank, see e.g.
			// https://www.data.wien.gv.at/txt/wrlinien-gtfs-routes.txt
			agency_id: "",
			route_short_name: line.name,
			route_type: routeTypeByProduct[line.product],
			// todo: route_color
		})
	}

	const addTrip = (trip) => {
		trips.push({
			route_id: null, // todo
			service_id: null, // todo
			trip_id: trip.id,
			trip_headsign: trip.direction,
			direction_id: null, // todo
			// todo: shape_id
			// todo: wheelchair_accessible, bikes_allowed
		})
	}

	const addStopover = (stopover, trip, i) => {
		stop_times.push({
			trip_id: trip.id,
			arrival_time: stopover.plannedArrival,
			departure_time: stopover.plannedDeparture,
			stop_id: stopover.stop.id,
			stop_sequence: i,
			stop_headsign: trip.direction,
			// todo: pickup_type, drop_off_type
			// todo: shape_dist_traveled
			timepoint: 1, // "Times are considered exact."
		})
	}

	const fetchTrip = (dep, station) => async () => {
		const lineName = dep.line && dep.line.name || 'foo'
		const trip = await hafas.trip(dep.tripId, lineName)
		if (!trip.line) {
			debug('invalid trip', trip)
			return;
		}

		// if (trip.line.operator) addOperator(trip.line.operator)
		addLine(trip.line)
		addTrip(trip)
		for (let i = 0; i < trip.stopovers.length; i++) {
			const stopover = trip.stopovers[i]
			addStop(stopover.stop)
			addStopover(stopover, trip, i)
		}
	}

	const collectOps = {
		remarks: false,
	}
	if (hafas.profile.departuresStbFltrEquiv !== false) {
		collectOps.includeRelatedStations = false
	}
	const collectDeps = createCollectDeps(hafas.departures, collectOps, durStep)

	const end = begin + duration
	const collectDepsAt = (station) => async () => {
		debug('fetching departures', station.id, station.name)
		for await (let deps of collectDeps(station.id, begin)) {
			deps = deps
			.filter(isValidDep)
			.sort((a, b) => new Date(a.plannedWhen) - new Date(b.plannedWhen))

			for (const dep of deps) {
				if (!trips.has(dep.tripId))
					queue.push(fetchTrip(dep, station))
				if (!agencies.has(dep.line.operator.name))
					queue.push(addAgency(dep))
			}

			if (deps.length === 0) {
				// todo: try for a little longer
				debug('0 departures', deps) // todo: log `when`
				break
			}
			const lastWhen = +new Date(deps[deps.length - 1].plannedWhen)
			if (lastWhen >= end) break
		}
	}
	for (const station of stations) {
		queue.push(collectDepsAt(station))
	}

	let done = 0
	queue.on('success', () => {
		done++
		debug('progress', done, '/', queue.length + done)
	})
	queue.start()
	await new Promise((resolve, reject) => {
		queue.once('error', (err) => {
			reject(err)
			queue.end(err)
		})
		queue.once('end', () => resolve())
	})

	// todo
}

module.exports = generateGtfs

'use strict'

const debug = require('debug')('hafas-generate-gtfs:find-departures-duration-limit')

const MAX_ITERATIONS = 12

const durationLimits = new WeakMap()

// This function find *any* high-enough duration that seems to "touch"
// the HAFAS-dictated limit of departures() results.
const findDeparturesDurationLimit = async (hafas, station) => {
	if (durationLimits.has(hafas)) return durationLimits.get(hafas)

	const testWith = async (duration) => {
		const opt = {duration, results: Infinity}
		const results = (await hafas.departures(station, opt)).length
		debug(`hafas.departures() with ${duration}:`, results, 'results')
		return results
	}

	let i = 0, lastResults = 0
	let lower = 15, upper = 30 // minutes
	while (i++ < MAX_ITERATIONS) {
		const results = await testWith(upper)
		if (results <= lastResults) {
			debug('no increase in results with', upper)
			break
		}
		lastResults = results
		lower = upper
		upper *= 2
	}

	while (i++ < MAX_ITERATIONS) {
		debug('lower bound', lower, 'upper bound', upper)
		const middle = Math.round(lower + (upper - lower) / 2)
		const results = await testWith(middle)
		if (results > lastResults) lower = duration = middle
		else upper = middle
	}

	debug('result', lower)
	durationLimits.set(hafas, lower)
	return lower
}

module.exports = findDeparturesDurationLimit

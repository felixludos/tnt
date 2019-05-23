from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete
from tnt_cards import discard_cards
from tnt_units import add_unit, move_unit, remove_unit
from tnt_util import travel_options
from government import check_revealable, reveal_tech
import random

border_types = {
    'Coast': 'sea',
    'Forest': 'land',
    'Plains': 'land',
    'Sea': 'sea',
    'Ocean': 'sea',
    'Strait': None,
    'Ocean-Africa': 'sea',
    'Mountains': 'land',
    'River': 'land',
}

# TODO: reverse order: compute a set of all tiles reachable from set of maincapital or subcapitals, then check set for each territory
def find_path(G,
              loc,
              goals,
              player,
              neutrals=False,
              peaceful=False,
              observed=None,
              switch_limits=None,
              switch_current=None,
              africa=True):
	if loc in goals:
		return True

	if observed is None:
		observed = xset()

	tile = G.tiles[loc]
	observed.add(loc)

	if peaceful and 'disputed' in tile:
		return False

	if 'alligence' in tile:
		owner = tile.owner if 'owner' in tile else G.nations.designations[tile.alligence]

		if owner != player and (not neutrals or owner in G.players):
			return False
	else:  # sea/ocean
		wars = G.players[player].stats.at_war_with
		powers = present_powers(G, tile)

		for power in powers:
			if power in wars and wars[power]:
				return False

	# recurse
	for neighbor, border in tile.borders.items():
		if neighbor in observed:
			continue

		budget = switch_limits
		group = switch_current

		if budget is not None:

			if switch_current is None:
				switch_current = border_types[border]
			elif border_types[border] is not None and switch_current != border_types[border]:
				budget -= 1
				group = border_types[border_types]

			if budget < 0:
				continue

		if 'Africa' in border and not africa:
			continue

		if find_path(
		    G,
		    loc,
		    goals,
		    player,
		    neutrals=neutrals,
		    peaceful=peaceful,
		    observed=observed,
		    switch_current=group,
		    switch_limits=budget):
			return True
	return False

def blockade_phase(G, player, action):

	print('blockade_phase............\n', G.players)
	for pl in G.players:
		faction = G.players[pl]  #@@@@

		if not faction.stats.at_war:
			G.logger.write('{} is at peace, so there are no blockades'.format(pl))
			continue

		goals = xset()
		goals.add(faction.stats.cities.MainCapital)

		for tilename in faction.territory:

			connected = find_path(
			    G, tilename, goals=goals, player=pl, neutrals=True, switch_limits=1, peaceful=True, africa=False)

			tile = G.tiles[tilename]

			res, pop = 0, 0

			africa_connected = True
			if 'res_afr' in tile:
				africa_connected = find_path(
				    G, tilename, goals=goals, player=pl, neutrals=True, switch_limits=1, peaceful=True, africa=True)

			# regular
			if not connected:
				tile.blockaded = True

				G.updated[tilename] = tile

				msg = ''

				pop = -tile['pop']
				res = -tile['res']

				if pop > 0 or res > 0:
					msg += ''.format(pl, pop, res)

				G.logger.write('{} is blockaded from {} (losing POP={} RES={})'.format(tilename, pl, -pop, -res))

			elif 'blockaded' in tile:

				del tile.blockaded

				G.updated[tilename] = tile

				pop = tile['pop']
				res = tile['res']

				G.logger.write('{} regains trade routes to {} (regaining POP={} RES={})'.format(pl, tilename, pop, res))

			# trans africa
			if not africa_connected:
				res -= tile.res_afr

				tile.blockaded_afr = True
				G.updated[tilename] = tile

				G.logger.write('Trans-Africa route for {} is also blockaded ({} loses RES={})'.format(
				    tilename, pl, tile.res_afr))

			elif 'blockaded_afr' in tile:
				del tile.blockaded_afr
				res += tile.res_afr

				G.updated[tilename] = tile

				G.logger.write('Trans-Africa route is no longer blockaded in {} ({} regains RES={})'.format(
				    tilename, pl, tile.res_afr))

			faction.tracks.POP += pop
			faction.tracks.RES += res

	raise PhaseComplete

def supply_phase(G, player, action):

	for pl, faction in G.players:

		goals = xset(faction.stats.cities.SubCapitals)
		goals.add(faction.stats.cities.MainCapital)

		if not faction.stats.at_war:
			G.logger.write('{} is at peace, so all units are supplied'.format(pl))
			continue

		for uid, unit in faction.units:
			if unit.type == 'Fortress' or G.units.rules[unit.type].type != 'G':
				continue

			supplied = find_path(G, unit.tile, goals=goals, player=pl)
			tile = G.tiles[unit.tile]

			if not supplied:
				unit.cv -= 1
				if unit.cv == 0:
					msg = 'was eliminated'
					remove_unit(G, unit)

					# TODO: check for forced retreats of ANS

				else:
					msg = 'lost 1 cv'
					G.objects.updated[uid] = unit

				G.logger.write('{} unit in {} {} due to lack of supplies'.format(pl, unit.tile, msg))

			elif 'unsupplied' in tile and pl in tile.unsupplied:
				tile.unsupplied.remove(pl)
				if len(tile.unsupplied) == 0:
					del tile.unsupplied
				G.objects.updated[tile._id] = tile

	raise PhaseComplete
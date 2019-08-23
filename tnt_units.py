from util import adict, idict, xset, load, save, collate, uncollate, tset
from tnt_errors import ActionError

class OutOfReservesError(ActionError):
	pass

def load_unit_rules(G, unit_rules_path='config/units.yml', unit_count_path='config/unit_count.yml'):

	unit_rules = load(unit_rules_path)
	unit_count = load(unit_count_path)

	G.units = adict()

	G.units.rules = unit_rules
	G.units.placeable = xset(name for name, rules in unit_rules.items() if 'not_placeable' not in rules)
	G.units.priorities = [n for n, _ in sorted(unit_rules.items(), key=lambda x: x[1].priority)]

	G.units.reserves = unit_count

# def check_unsupplied(G, player, tile):
# 	if 'unsupplied' not in tile or player not in tile.unsupplied:
# 		return
#
# 	for uid in tile.units:
# 		unit = G.objects.table[uid]
# 		if unit.type != 'Fortress' and G.units.rules[unit.type].type:
#
# 			pass
# 			if G.nations.designations[unit.nationality] == player:
# 				pass

def move_unit(G, unit, to_tilename):

	# possibly convert to/from convoy
	check_for_convoy(unit, G.tiles[to_tilename])

	tile = G.tiles[unit.tile]
	tile.units.discard(unit._id)
	G.objects.updated[unit.tile] = tile

	# check_unsupplied(G, G.nations.designations[unit.nationality], tile)

	unit.tile = to_tilename
	tile = G.tiles[unit.tile]
	tile.units.add(unit._id)

	G.objects.updated[unit._id] = unit
	G.objects.updated[unit.tile] = tile

def add_unit(G, unit):  # tile, type, cv, nationality

	unit = idict(unit.items())
	unit.obj_type = 'unit'

	if 'cv' not in unit:  # by default add a cadre
		unit.cv = 1
	else:
		assert 1 <= unit.cv <= 4, '{} is an invalid cv value: {}'.format(unit.cv, unit)

	player = G.nations.designations[unit.nationality]

	#if player is 'Minor': #@@@
	if player == 'Minor':
		unit.visible = tset(G.players.keys())

		#G.nations.status[unit.nationality][unit._id] = unit #@@@
		G.nations.status[unit.nationality].units[unit._id] = unit

	else:
		unit.visible = tset({G.nations.designations[unit.nationality]})

		# check/update reserves
		reserves = G.units.reserves[unit.nationality]
		if unit.type not in reserves or reserves[unit.type] == 0:
			raise OutOfReservesError('{} has no more {}'.format(unit.nationality, unit.type))
		reserves[unit.type] -= 1

		G.players[player].units[unit._id] = unit

	tilename = unit.tile

	tile = G.tiles[tilename]

	# check for multiple fortresses
	if unit.type == 'Fortress':
		assert not (tile.type == 'Sea' or
		            tile.type == 'Ocean'), 'Fortresses cannot be placed in the Sea/Ocean {}'.format(tilename)
		for unit_id in tile.units:
			assert G.objects.table[unit_id].type != 'Fortress', 'There is already a Fortress in {}'.format(
			    G.objects.table[unit_id].tile)

	# check convoy
	check_for_convoy(unit, tile)

	# add to sets
	tile.units.add(unit._id)
	G.objects.table[unit._id] = unit
	G.objects.created[unit._id] = unit
	G.objects.updated[tilename] = tile

	return unit

def check_for_convoy(unit, tile):
	if (unit.type == 'Infantry' or unit.type == 'Tank') \
          and (tile.type == 'Sea' or tile.type == 'Ocean'):
		unit.carrying = unit.type
		unit.type = 'Convoy'
	elif unit.type == 'Convoy' and tile.type != 'Sea' and tile.type != 'Ocean':
		unit.type = unit.carrying
		del unit.carrying

def remove_from_play(G,uid):
	unit = G.objects.table[uid]
	player = G.nations.designations[unit.nationality]
	tilename = unit.tile
	if unit.type == 'Convoy':
		unit.type = unit.carrying
		del unit.carrying
	if player in {'Minor', 'Major'}:
		status = G.nations.status[unit.nationality]
		del status.units[unit._id]
	#reserve is not updated!
	G.tiles[tilename].units.remove(unit._id)
	if player in G.players:
		del G.players[player].units[unit._id]
	del G.objects.table[unit._id]
	G.objects.removed[unit._id] = unit

def remove_unit(G, unit):
	player = G.nations.designations[unit.nationality]
	tilename = unit.tile
	if unit.type == 'Convoy':
		unit.type = unit.carrying
		del unit.carrying
	if player in {'Minor', 'Major'}:
		status = G.nations.status[unit.nationality]
		del status.units[unit._id]
	else:
		# update reserves
		reserves = G.units.reserves[unit.nationality]
		if unit.type not in reserves:
			reserves[unit.type] = 0
		reserves[unit.type] += 1
	G.tiles[tilename].units.remove(unit._id)
	if player in G.players:
		del G.players[player].units[unit._id]
	del G.objects.table[unit._id]
	G.objects.removed[unit._id] = unit

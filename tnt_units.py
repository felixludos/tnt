from tnt_util import adict, idict, xset, load, save, collate, uncollate, tset
from tnt_errors import ActionError


class OutOfReservesError(ActionError):
	pass


def load_unit_rules(G, unit_rules_path='config/units.yml',
                    unit_count_path='config/unit_count.yml'):
	
	unit_rules = load(unit_rules_path)
	unit_count = load(unit_count_path)
	
	G.units = adict()
	
	G.units.rules = unit_rules
	G.units.placeable = xset(name for name, rules in unit_rules.items() if 'not_placeable' not in rules)
	G.units.priorities = [n for n, _ in sorted(unit_rules.items(), key=lambda x: x[1].priority)]
	
	G.units.reserves = unit_count
	
def move_unit(G, unit, to_tilename):
	
	# possibly convert to/from convoy
	check_for_convoy(unit, G.tiles[to_tilename])
	
	G.tiles[unit.tile].units.remove(unit._id)
	unit.tile = to_tilename
	G.tiles[unit.tile].units.add(unit._id)
	
	G.objects.updated[unit._id] = unit
	
def add_unit(G, unit): # tile, type, cv, nationality
	
	unit = idict(unit.items())
	unit.obj_type = 'unit'
	unit.visible = tset({G.nations[unit.nationality]})
	
	if 'cv' not in unit: # by default add a cadre
		unit.cv = 1
	
	player = G.nations[unit.nationality]
	tilename = unit.tile
	
	tile = G.tiles[tilename]
	
	# check for multiple fortresses
	if unit.type == 'Fortress':
		assert not (tile.type == 'Sea' or tile.type == 'Ocean'), 'Fortresses cannot be placed in the Sea/Ocean {}'.format(tilename)
		for unit_id in tile.units:
			assert G.objects.table[unit_id].type != 'Fortress', 'There is already a Fortress in {}'.format(G.objects.table[unit_id].tile)
	
	# check/update reserves
	reserves = G.units.reserves[unit.nationality]
	if unit.type not in reserves or reserves[unit.type] == 0:
		raise OutOfReservesError('{} has no more {}'.format(unit.nationality, unit.type))
	reserves[unit.type] -= 1
	
	# check convoy
	check_for_convoy(unit, tile)
	
	# add to sets
	tile.units.add(unit._id)
	G.players[player].units.add(unit)
	G.objects.table[unit._id] = unit
	G.objects.created[unit._id] = unit

def check_for_convoy(unit, tile):
	if (unit.type == 'Infantry' or unit.type == 'Tank') \
		and (tile.type == 'Sea' or tile.type == 'Ocean'):
		unit.carrying = unit.type
		unit.type = 'Convoy'
	elif unit.type == 'Convoy' and tile.type != 'Sea' and tile.type != 'Ocean':
		unit.type = unit.carrying
		del unit.carrying

def remove_unit(G, unit):
	player = G.nations[unit.nationality]
	tilename = unit.tile
	
	if unit.type == 'Convoy':
		unit.type = unit.carrying
		del unit.carrying
	
	# update reserves
	reserves = G.units.reserves[unit.nationality]
	if unit.type not in reserves:
		reserves[unit.type] = 0
	reserves[unit.type] += 1
	
	G.tiles[tilename].units.remove(unit._id)
	G.players[player].units.remove(unit)
	del G.objects.table[unit._id]
	G.objects.removed[unit._id] = unit
	




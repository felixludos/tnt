from tnt_util import xdict, xset, load
from tnt_errors import ActionError

class InvalidTileError(ActionError):
	pass

class OutOfReservesError(ActionError):
	pass


def load_unit_rules(G, unit_rules_path='config/units.yml',
                    unit_count_path='config/unit_count.yml'):
	
	unit_rules = load(unit_rules_path)
	unit_count = load(unit_count_path)
	
	G.units = xdict()
	
	G.units.rules = unit_rules
	G.units.placeable = xset(name for name, rules in unit_rules.items() if 'not_placeable' not in rules)
	G.units.priorities = [n for n, _ in sorted(unit_rules.items(), key=lambda x: x[1].priorities)]
	
	G.units.reserves = unit_count
	
def move_unit(G, unit, to_tilename):
	
	# possibly convert to/from convoy
	check_for_convoy(unit, G.tiles[to_tilename])
	
	G.tiles[unit.tile].units.remove(unit)
	unit.tile = to_tilename
	G.tiles[unit.tile].units.add(unit)
	
def add_unit(G, unit): # tile, type, cv, nationality
	
	player = G.nations[unit.nationality]
	tilename = unit.tile
	
	tile = G.tiles[tilename]
	
	# check/update reserves
	reserves = G.units.reserves[unit.nationality]
	if unit.type not in reserves or reserves[unit.type] == 0:
		raise OutOfReservesError('{} has no more {}'.format(unit.nationality, unit.type))
	reserves[unit.type] -= 1
	
	# check convoy
	check_for_convoy(unit, tile)
	
	# add to sets
	tile.units.add(unit)
	G.players[player].units.add(unit)

def check_for_convoy(unit, tile):
	if (unit.type == 'Infantry' or unit.type == 'Tank') \
		and (tile.type == 'Sea' or tile.type == 'Ocean'):
		unit.carrying = unit.type
		unit.type = 'Convoy'
	elif unit.type == 'Convoy' and tile.type != 'Sea' and tile.type != 'Ocean':
		unit.type = unit.carrying
		del unit.carrying

def remove_unit(G, unit):
	pass




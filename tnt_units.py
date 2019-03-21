from tnt_util import xdict, xset, load


class InvalidTileError(Exception):
	pass

class OutOfReservesError(Exception):
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
	
def move_unit(G, unit, to_tile):
	pass
	
def add_unit(G, unit): # tile, type, cv, faction
	
	player = unit.faction
	tilename = unit.tile
	utype = unit.type
	
	assert utype != 'Convoy', 'Cant directly add a convoy'
	
	tile = G.tiles[tilename]
	
	if G.units.rules[utype] and (tile.type == 'Sea' or tile.type == 'Ocean'):
		assert utype == 'Infantry' or utype == 'Tank', 'Convoy can only transport Infantry and Tank'
		unit.carrying = utype
	
	G.tiles[tilename].units.append(unit)
	G.players[player].units.append(unit)

def remove_unit(G, unit):
	pass




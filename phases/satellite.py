from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete, PhaseInterrupt
from tnt_cards import discard_cards
from util.tnt_units import add_unit, move_unit, remove_unit
from util.tnt_util import travel_options, placeable_units, compute_tracks
from tnt_cards import draw_cards


class Satellite_Phase(GamePhase):
	
	def encode(self, G):
		code = adict()
		
		for player, tilenames in G.temp.sat_units.items():
			options = placeable_units(G, player, G.players[player].stats.great_power, tilenames)
			if len(options):
				code[player] = options
		
		return code
	
	def execute(self, G, player=None, action=None):
		
		if 'new_sats' in G.temp:
			
			new_sats = G.temp.new_sats
			
			if 'USA' in new_sats:
				name = new_sats['USA']
				del new_sats['USA']
				
				USA_becomes_satellite(G, name)
			
			sat_units = tdict()
			for nation, fname in new_sats.items():
				becomes_satellite(G, fname, nation)
				
				if G.nations.status[nation].is_armed:  # replace currently existing troops
					G.logger.write('{} may replace Armed Minor units in {}'.format(fname, nation))
					removed = []
					for uid, unit in G.nations.status[nation].units:
						if fname not in sat_units:
							sat_units[fname] = tdict()
						sat_units[fname][unit.tile] = unit.cv
						removed.append(unit)
					
					for unit in removed:
						remove_unit(G, unit)
				
				else:
					ts = []
					for tilename in G.nations.territories[nation]:
						tile = G.tiles[tilename]
						if 'muster' in tile and tile.muster > 0:
							if fname not in sat_units:
								sat_units[fname] = tdict()
							sat_units[fname][tilename] = tile.muster
							ts.append(tilename)
					
					G.logger.write('{} may place units into {}'.format(fname, ', '.join(ts)))
			G.temp.sat_units = sat_units
			del G.temp.new_sats
		
		if action is not None:
			
			assert player in G.temp.sat_units, '{} has no garrison troops to place'.format(player)
			
			unit = adict()
			unit.tile, unit.type = action
			unit.nationality = G.players[player].stats.great_power
			unit.cv = G.temp.sat_units[player][unit.tile]
			add_unit(G, unit)
			del G.temp.sat_units[player][unit.tile]
			if len(G.temp.sat_units[player]) == 0:
				del G.temp.sat_units[player]
		
		if len(G.temp.sat_units):
			return
		
		del G.temp.sat_units
		
		raise PhaseComplete



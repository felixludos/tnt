from util import tdict, tset, adict, tlist, idict, load, save, collate, uncollate, xset, seq_iterate, PhaseComplete
from util.tnt_util import compute_tracks, placeable_units
from tnt_cards import load_card_decks, draw_cards
from tnt_errors import ActionError
from util.tnt_units import load_unit_rules, add_unit
import random

# TODO: handle path to config files better than hardcoding
player_setup_path = 'config/faction_setup.yml'

class Setup_Phase(GamePhase):
	
	def encode(self, G):
		code = adict()
		
		for faction, nationality, tilenames in seq_iterate(G.temp.setup, [None, 'cadres', None], end=True):
			# if player is not None and faction != player:
			# 	continue
			
			options = placeable_units(G, faction, nationality, tilenames)
			
			# print(nationality, tilenames)
			
			if len(options) == 0:
				continue
			
			if faction not in code:
				code[faction] = xset()
			
			code[faction].add((nationality, options))
		
		if len(code) == 0:
			raise PhaseComplete
		
		return code
	
	def execute(self, G, player=None, action=None): # player, nationality, tilename, unit_type
		# place user chosen units
		
		if action is None:  # pre phase
			
			player_setup = load(player_setup_path)
			
			# prep temp info - phase specific data
			
			temp = tdict()
			temp.setup = tdict()
			
			for name, faction in player_setup.items():
				
				if 'units' in faction.setup:
					
					for unit in faction.setup.units:
						add_unit(G, unit)
					
					del faction.setup.units
				
				temp.setup[name] = faction.setup
			
			G.temp = temp
			
			# return action adict(faction: (action_keys, action_options))
			return
		
		nationality, tilename, unit_type = action
		
		unit = adict()
		unit.nationality = nationality
		unit.tile = tilename
		unit.type = unit_type
		
		# print(unit)
		
		add_unit(G, unit)
		
		G.temp.setup[player].cadres[nationality][tilename] -= 1
		if G.temp.setup[player].cadres[nationality][tilename] == 0:
			del G.temp.setup[player].cadres[nationality][tilename]
		
		if len(G.temp.setup[player].cadres[nationality]) == 0:
			del G.temp.setup[player].cadres[nationality]
		
		if len(G.temp.setup[player].cadres) == 0:  # all cadres are placed
			del G.temp.setup[player].cadres
			
			if 'action_cards' in G.temp.setup[player]:
				draw_cards(G, 'action', player, N=G.temp.setup[player].action_cards)
				del G.temp.setup[player].action_cards
			
			if 'investment_cards' in G.temp.setup[player]:
				draw_cards(G, 'action', player, N=G.temp.setup[player].action_cards)
				del G.temp.setup[player].investment_cards
		
		return
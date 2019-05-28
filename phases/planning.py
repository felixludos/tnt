from util import adict, xset, tdict, tlist, tset, idict, PhaseComplete, PhaseInterrupt
from tnt_cards import discard_cards
from util.tnt_units import add_unit, move_unit, remove_unit
from util.tnt_util import travel_options, add_next_phase, switch_phase
from government import check_revealable, reveal_tech
from diplomacy import declaration_of_war, violation_of_neutrality, convert_to_armed_minor, USA_becomes_satellite


class Planning_Phase(GamePhase):
	
	def encode(self, G):
		code = adict()
		
		player = G.temp.active_players[G.temp.active_idx]
		options = xset()
		options.add('pass')
		
		options.update(G.players[player].hand)
		# options.update(cid for cid in G.players[player].hand if 'action' in G.objects.table[cid].obj_type)
		
		code[player] = (options,)
		
		return code
	
	def execute(self, G, player=None, action=None):
		
		if action is None:
			if 'temp' in G:
				del G.temp
			
			G.temp = tdict()
			G.temp.season = G.game.sequence[G.game.index]
			
			G.temp.active_idx = 0
			G.temp.active_players = G.game.turn_order.copy()
			if G.temp.season == 'Winter':
				G.temp.active_players = tlist(p for p in G.game.turn_order if G.players[p].stats.enable_Winter)
			
			G.temp.decision = tdict()
			G.temp.passes = 0
			
			G.temp.borders = tdict({p: tdict() for p in G.players})
			
			return
		
		faction = G.players[player]
		
		head, *tail = action
		
		if head == 'pass':
			G.temp.passes += 1
			G.temp.active_idx += 1
			G.temp.active_idx %= len(G.temp.active_players)
			
			G.logger.write('{} passes'.format(player))
		
		elif head in faction.hand:
			G.temp.passes = 0
			card = G.objects.table[head]
			# if 'owner'
			del card.owner
			G.objects.updated[head] = card
			
			G.temp.decision[player] = card
			
			faction.hand.remove(head)
			
			G.logger.write('{} plays a card'.format(player))
			
			G.temp.active_players.remove(player)
			if len(G.temp.active_players):
				G.temp.active_idx %= len(G.temp.active_players)
		
		if len(G.temp.active_players) > G.temp.passes:
			return
		
		# evaluate card choices
		
		G.temp.commands = tdict()
		
		for p, card in G.temp.decision.items():  # RULE OVERRULED: emergency priority tie breaks are automatic
			if 'season' in card:
				cmd = tdict()
				cmd.priority = card.priority
				cmd.moved = tset()
				
				if card.season == G.temp.season:
					val = card.value
					msg = ' {} command: {} {}'.format(card.season, card.priority, val)
				else:
					cmd.emergency = True
					val = G.players[p].stats.emergency_command
					msg = 'n emergency command: {} {}'.format(card.priority, val)
				
				cmd.value = val
				G.temp.commands[p] = cmd
			
			else:
				msg = ' bluff (investment card)'
			
			G.logger.write('{} has played a{}'.format(p, msg))
			
			discard_cards(G, card._id)
		
		if len(G.temp.commands):
			
			G.temp.order = tlist(k for k, v in sorted(
				[(k, v.priority + ('e' if 'emergency' in v else '')) for k, v in G.temp.commands.items()],
				key=lambda x: x[1]))
			G.logger.write('Play order is: {}'.format(', '.join(G.temp.order)))
			
			G.temp.active_idx = 0
			
			add_next_phase(G, 'Movement')
		
		else:
			G.logger.write('No player played a command card during {}'.format(G.temp.season))
		
		raise PhaseComplete

